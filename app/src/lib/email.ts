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

/**
 * True only when mail can reach any address: an API key AND a sender on a
 * domain verified in Resend. The fallback onboarding@resend.dev sender only
 * delivers to the Resend account owner, so verification emails to users
 * would silently never arrive.
 */
export function canEmailAnyAddress(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

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
  <body style="margin:0;padding:0;background-color:#faf8f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#17131f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#faf8f4;padding:36px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#fffdfb;border:1px solid #eee4dd;border-radius:24px;padding:34px;box-shadow:0 18px 48px rgba(60,43,25,0.08);">
            <tr>
              <td>
                <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#17131f;">Reset your password</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#57534e;">Hi ${safeName},</p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#57534e;">We got a request to reset the password for your Mychelin account. Click the button below to choose a new password. This link expires in 1 hour.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
                  <tr>
                    <td style="border-radius:10px;background-color:#17131f;">
                      <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Reset password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#78716c;">If the button doesn&rsquo;t work, copy and paste this link into your browser:</p>
                <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safeUrl}" style="color:#800020;text-decoration:underline;">${safeUrl}</a></p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#78716c;">If you didn&rsquo;t request this, you can safely ignore this email &mdash; your password won&rsquo;t change.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:12px;color:#a8a29e;">Mychelin &middot; Cook like home, even in your new home.</p>
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
    // The Resend SDK reports a refused send (bad sender, testing-domain
    // recipient limit, quota) as a returned `error`, not a thrown one.
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject: "Reset your Mychelin password",
      html: buildResetEmailHtml(name, resetUrl),
    });
    if (error) {
      console.error("[email] Resend refused password reset email:", error.name, error.message);
    }
  } catch (err) {
    console.error("[email] Failed to send password reset email:", err);
    // Intentionally don't rethrow — the calling route should still return 200
    // so that the email-existence check doesn't leak.
  }
}

function buildVerificationEmailHtml(name: string, verifyUrl: string): string {
  const safeName = escapeHtml(name || "there");
  const safeUrl = escapeHtml(verifyUrl);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Confirm your email for Mychelin</title>
  </head>
  <body style="margin:0;padding:0;background-color:#faf8f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#17131f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#faf8f4;padding:36px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#fffdfb;border:1px solid #eee4dd;border-radius:24px;padding:34px;box-shadow:0 18px 48px rgba(60,43,25,0.08);">
            <tr>
              <td>
                <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#17131f;">Confirm your email</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#57534e;">Hi ${safeName},</p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#57534e;">Welcome to Mychelin. Please confirm this is your email address, so we can help you get back into your account if you ever forget your password. This link expires in 24 hours.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
                  <tr>
                    <td style="border-radius:10px;background-color:#17131f;">
                      <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Confirm my email</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#78716c;">If the button doesn&rsquo;t work, copy and paste this link into your browser:</p>
                <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safeUrl}" style="color:#800020;text-decoration:underline;">${safeUrl}</a></p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#78716c;">If you didn&rsquo;t create a Mychelin account, please don&rsquo;t confirm &mdash; just ignore this email.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:12px;color:#a8a29e;">Mychelin &middot; Cook like home, even in your new home.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Sends the "confirm your email" link. Returns true only when Resend accepted
 * the message; false when no API key is set or Resend reports an error.
 * Throws only on a network/SDK exception, which callers must catch.
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  verifyUrl: string
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping verification email");
    return false;
  }
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to,
    subject: "Confirm your email for Mychelin",
    html: buildVerificationEmailHtml(name, verifyUrl),
  });
  if (error) {
    console.error("[email] Failed to send verification email:", error);
    return false;
  }
  return true;
}
