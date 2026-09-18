import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotificationEmail } from '@/lib/email';

// Receives Supabase's Database Webhook fired on every INSERT into public.notifications
// (configured in the Supabase dashboard: Database > Webhooks), and forwards that same
// notification to the recipient's email via Resend. This is the only integration point —
// every RPC that already writes to `notifications` (accept_brief, assign_designer,
// submit_work, approve_brief, request_revision, cancel_brief, hold_brief, create_brief,
// update_brief_scope, reschedule_brief) gets email for free without touching any of them.
type WebhookPayload = {
  type: 'INSERT';
  table: string;
  record: { id: string; recipient_id: string; brief_id: string | null; message: string };
};

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (!process.env.NOTIFY_WEBHOOK_SECRET || secret !== process.env.NOTIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 });
  }

  const payload = (await request.json()) as WebhookPayload;
  if (payload.table !== 'notifications' || payload.type !== 'INSERT') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Service role bypasses RLS — required here since a webhook call has no logged-in user
  // session to read the recipient's profile under.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', payload.record.recipient_id)
    .single();

  if (!profile?.email) {
    return NextResponse.json({ error: 'Recipient has no email on file' }, { status: 200 });
  }

  const result = await sendNotificationEmail({
    to: profile.email,
    message: payload.record.message,
    briefId: payload.record.brief_id,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
