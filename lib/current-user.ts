import { cache } from 'react';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/workflow';

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  name: string;
  nickname: string | null;
  initials: string;
};

// Both the (app) layout and every page under it call getCurrentUser() — without this,
// that's 2x the auth.getUser() + profile round-trips to Supabase per page view, which is
// exactly what saturates a small project's Auth/DB connections when several people load
// pages at once. cache() memoizes the result per request so both callers share one call.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  // proxy.ts already ran auth.getUser() for this exact request and forwards the verified
  // id via this trusted header (never client-settable — proxy always strips it first) —
  // reuse it instead of paying for a second identical Auth API round-trip here. Falls
  // back to a real check only if the header is somehow missing.
  let userId = (await headers()).get('x-user-id');
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, name, nickname, initials')
    .eq('id', userId)
    .single();

  if (!profile) return null;
  return profile as CurrentUser;
});
