'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

type LoginRole = 'manager' | 'requester' | 'designer';

export async function signInWithGoogle(role: LoginRole) {
  const supabase = await createClient();

  // The `origin` header isn't reliably sent on every request (some browsers omit it on
  // plain navigations/form posts), and when it came back null here, the redirectTo below
  // became "null/auth/callback?...", failed to match Supabase's redirect allow-list, and
  // silently fell back to Supabase's configured Site URL (which was still the localhost
  // dev address) — bouncing real users on delidesign.online to an unreachable localhost
  // after Google sign-in. `host`/`x-forwarded-proto` are set by Netlify on every proxied
  // request, so they don't have that gap.
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = host ? `${proto}://${host}` : h.get('origin');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?role=${role}`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? 'oauth_failed')}`);
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
