import { cache } from 'react';
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, name, nickname, initials')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  return profile as CurrentUser;
});
