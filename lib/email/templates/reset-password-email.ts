// lib/email/templates/reset-password-email.ts
export function resetPasswordEmailHtml(url: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Manrope, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #f7f9fc;">
        <div style="background: #ffffff; border-radius: 12px; padding: 40px; border: 1px solid #e2e8f0;">
          <h2 style="color: #111827; font-size: 22px; font-weight: 600; margin: 0 0 12px;">Reset your password</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Click the button below to reset your SecureGate password.
            This link expires in <strong>1 hour</strong>.
          </p>
          <a
            href="${url}"
            style="display: inline-block; background: hsl(226, 70%, 55%); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 24px;"
          >
            Reset password
          </a>
          <p style="color: #6B7280; font-size: 13px; margin: 0 0 16px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            If the button above doesn't work, copy and paste this URL into your browser:<br/>
            <span style="color: #374151;">${url}</span>
          </p>
        </div>
      </body>
    </html>
  `;
}
