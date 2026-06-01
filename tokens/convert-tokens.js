/**
 * convert-tokens.js
 *
 * Converts color-tokens.json and design-tokens.tokens.json into a single
 * tokens.css file containing CSS custom properties.
 *
 * Color rules:
 *  - Only `color.role` values are emitted as CSS variables (not primitives).
 *  - Role values are token references like `{color.palette.primary.40}` or
 *    `{color.key.primary}`. These are resolved to their actual HSL values
 *    before writing to CSS.
 *  - Light roles go into :root  (default / light theme).
 *  - Dark roles go into [data-theme="dark"] and @media (prefers-color-scheme: dark).
 *
 * Typography rules:
 *  - The `typography` section of design-tokens.tokens.json is used (it has
 *    the fully normalised per-property structure).
 *  - Dimension values (fontSize, lineHeight, letterSpacing) are emitted in px.
 *  - Variable names follow the pattern:
 *      --font-{category}-{scale}-{property}
 *    e.g.  --font-display-large-font-size
 *
 * Usage:  node convert-tokens.js
 * Output: tokens.css  (in the same directory)
 */

const fs   = require('fs');
const path = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────
const DIR              = __dirname;
const COLOR_FILE       = path.join(DIR, 'color-tokens.json');
const TYPOGRAPHY_FILE  = path.join(DIR, 'design-tokens.tokens.json');
const OUTPUT_FILE      = path.join(DIR, 'tokens.css');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a token reference string like "{color.palette.primary.40}" or
 * "{color.key.primary}" to its raw value using the color JSON object.
 * Returns null (and logs a warning) if the path cannot be resolved.
 */
function resolveColorRef(ref, colorData) {
  // Strip surrounding braces
  const inner = ref.replace(/^\{|\}$/g, '');
  // Walk the key path  e.g. ["color", "palette", "primary", "40"]
  const parts = inner.split('.');
  let node = { color: colorData };
  for (const part of parts) {
    if (node == null || typeof node !== 'object') {
      console.warn(`⚠️  Cannot resolve token reference "${ref}" — path broken at "${part}". Skipping.`);
      return null;
    }
    node = node[part];
  }
  if (typeof node !== 'string') {
    console.warn(`⚠️  Token reference "${ref}" did not resolve to a string (got ${JSON.stringify(node)}). Skipping.`);
    return null;
  }
  return node;
}

/**
 * Convert a camelCase string to kebab-case.
 * e.g. "onPrimaryContainer" → "on-primary-container"
 */
function toKebab(str) {
  return str.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Convert a token scale name like "display large" or "headline medium"
 * to a CSS-safe segment: "display-large", "headline-medium".
 */
function scaleToKebab(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Convert a typography property name to its CSS variable suffix.
 * Numeric dimension properties get a "px" suffix when emitted as values.
 */
function propToVarName(prop) {
  const map = {
    fontSize:        'font-size',
    textDecoration:  'text-decoration',
    fontFamily:      'font-family',
    fontWeight:      'font-weight',
    fontStyle:       'font-style',
    fontStretch:     'font-stretch',
    letterSpacing:   'letter-spacing',
    lineHeight:      'line-height',
    paragraphIndent: 'paragraph-indent',
    paragraphSpacing:'paragraph-spacing',
    textCase:        'text-case',
  };
  return map[prop] || toKebab(prop);
}

/** Properties that should have a "px" unit appended. */
const PX_PROPS = new Set([
  'fontSize', 'lineHeight', 'paragraphIndent', 'paragraphSpacing',
]);

/** Properties that should have a "px" unit appended (letter-spacing is also px
 *  but can be 0 — still fine to append px). */
const PX_PROPS_ALWAYS = new Set([...PX_PROPS, 'letterSpacing']);

function formatValue(prop, value) {
  if (PX_PROPS_ALWAYS.has(prop) && typeof value === 'number') {
    return `${value}px`;
  }
  return String(value);
}

// ─── Load JSON ────────────────────────────────────────────────────────────────
const colorTokens = JSON.parse(fs.readFileSync(COLOR_FILE, 'utf8'));
const typographyTokens = JSON.parse(fs.readFileSync(TYPOGRAPHY_FILE, 'utf8'));

const colorData = colorTokens.color;   // { key, palette, role }

// ─── Process Color Roles ──────────────────────────────────────────────────────

function buildColorVars(roles) {
  const lines = [];
  for (const [roleName, ref] of Object.entries(roles)) {
    const varName  = `--color-${toKebab(roleName)}`;
    const resolved = resolveColorRef(ref, colorData);
    if (resolved === null) {
      lines.push(`  /* ${varName}: <unresolved ref: ${ref}> */`);
    } else {
      lines.push(`  ${varName}: ${resolved};`);
    }
  }
  return lines;
}

const lightVars = buildColorVars(colorData.role.light);
const darkVars  = buildColorVars(colorData.role.dark);

// ─── Process Typography ───────────────────────────────────────────────────────

/**
 * Build CSS variable declarations for all typography scales.
 * The typography section looks like:
 *   typography → { display → { "display large" → { fontSize: {type, value}, … } } }
 */
function buildTypographyVars(typography) {
  const lines = [];

  // Properties to include (skip paragraphIndent, paragraphSpacing, textCase
  // as they are rarely useful as CSS vars, but we include everything for
  // completeness — comment out below if you want to trim).
  const SKIP_PROPS = new Set(['paragraphIndent', 'textDecoration', 'textCase', 'fontStretch']);

  for (const [category, scales] of Object.entries(typography)) {
    lines.push(`  /* ${category} */`);
    for (const [scaleName, props] of Object.entries(scales)) {
      const scaleKey = scaleToKebab(scaleName); // e.g. "display-large"
      for (const [prop, meta] of Object.entries(props)) {
        if (SKIP_PROPS.has(prop)) continue;
        const varName = `--font-${scaleKey}-${propToVarName(prop)}`;
        const value   = formatValue(prop, meta.value);
        lines.push(`  ${varName}: ${value};`);
      }
    }
    lines.push('');
  }

  return lines;
}

const typographyVars = buildTypographyVars(typographyTokens.typography);

// ─── Assemble CSS ─────────────────────────────────────────────────────────────

const now = new Date().toISOString();

const css = `/*
 * tokens.css
 * Auto-generated by convert-tokens.js on ${now}
 *
 * ⚠️  DO NOT EDIT MANUALLY — regenerate by running:
 *       node convert-tokens.js
 *
 * Contents:
 *   1. Color roles  — light theme (:root)
 *   2. Color roles  — dark theme  ([data-theme="dark"] / prefers-color-scheme)
 *   3. Typography   — all type-scale variables
 *
 * Usage:
 *   import / link this file and reference variables like:
 *     color: var(--color-primary);
 *     font-size: var(--font-display-large-font-size);
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1. COLOR ROLES — LIGHT THEME (default)
   ═══════════════════════════════════════════════════════════════════════════ */
:root {
${lightVars.join('\n')}
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. COLOR ROLES — DARK THEME
   ═══════════════════════════════════════════════════════════════════════════ */
[data-theme="dark"] {
${darkVars.join('\n')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${darkVars.map(l => '  ' + l).join('\n')}
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. TYPOGRAPHY SCALE
   ═══════════════════════════════════════════════════════════════════════════ */
:root {
${typographyVars.join('\n')}
}
`;

// ─── Write Output ─────────────────────────────────────────────────────────────
fs.writeFileSync(OUTPUT_FILE, css, 'utf8');

console.log(`✅  tokens.css generated successfully → ${OUTPUT_FILE}`);
console.log(`   Light color roles : ${Object.keys(colorData.role.light).length} variables`);
console.log(`   Dark  color roles : ${Object.keys(colorData.role.dark).length} variables`);
console.log(`   Typography vars   : ${typographyVars.filter(l => l.trim().startsWith('--')).length} variables`);
