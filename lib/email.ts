import { Resend } from 'resend';

// Lazily constructed so the app doesn't crash at import time in environments where
// RESEND_API_KEY isn't set yet (e.g. before the user finishes the email setup step).
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendNotificationEmail(params: {
  to: string;
  message: string;
  briefId: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const resend = getResend();
  if (!resend) return { error: 'RESEND_API_KEY is not configured' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://delidesign.online';
  const link = params.briefId ? `${siteUrl}/projects/${params.briefId}` : siteUrl;

  const { error } = await resend.emails.send({
    // Resend's shared sandbox sender — works immediately with no domain verification,
    // but only delivers to the Resend account's own verified email until a real sending
    // domain is added and verified (see: resend.com/domains).
    from: 'Deli Design Brief Hub <onboarding@resend.dev>',
    to: params.to,
    subject: 'Deli Design Brief Hub — อัปเดตบรีฟของคุณ · Update on your brief',
    html: `
      <div style="font-family: sans-serif; font-size: 15px; color: #1A1614; line-height: 1.6;">
        <p>${params.message}</p>
        <p><a href="${link}" style="color: #C4142F;">${link}</a></p>
      </div>
    `,
  });

  if (error) return { error: error.message };
  return { ok: true };
}
