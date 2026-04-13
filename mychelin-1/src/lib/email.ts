import { Resend } from "resend";

// Lazy init so a missing env var doesn't blow up at module load time.
let _resend: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!_resend) {
    _resend = new Resend(apiKey);
  }
  return _resend;
}

const DEFAULT_FROM = "Mychelin <onboarding@resend.dev>";

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildResetEmailHtml(name: string, resetUrl: string): string {
  const safeName = escapeHtml(name || "there");
  const safeUrl = escapeHtml(resetUrl);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Reset your Mychelin password</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#1c1917;">Reset your password</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#44403c;">Hi ${safeName},</p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#44403c;">We got a request to reset the password for your Mychelin account. Click the button below to choose a new password. This link expires in 1 hour.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
                  <tr>
                    <td style="border-radius:10px;background-color:#d97706;">
                      <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Reset password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#78716c;">If the button doesn&rsquo;t work, copy and paste this link into your browser:</p>
                <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safeUrl}" style="color:#b45309;text-decoration:underline;">${safeUrl}</a></p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#78716c;">If you didn&rsquo;t request this, you can safely ignore this email &mdash; your password won&rsquo;t change.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:12px;color:#a8a29e;">Mychelin &middot; Preserving family recipes</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  name: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping password reset email");
    return;
  }
  try {
    await resend.emails.send({
      from: fromAddress(),
      to,
      subject: "Reset your Mychelin password",
      html: buildResetEmailHtml(name, resetUrl),
    });
  } catch (err) {
    console.error("[email] Failed to send password reset email:", err);
    // Intentionally don't rethrow — the calling route should still return 200
    // so that the email-existence check doesn't leak.
  }
}
