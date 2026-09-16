import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

// department_status and get_login_stats are both readable without a session (public RLS
// policy / security definer), so this skips cookies() entirely and uses a plain anon
// client — that lets unstable_cache actually share one result across concurrent visitors
// instead of every login page load hitting Supabase on its own. Without this, a burst of
// people opening /login at once (e.g. everyone signing in Monday morning) fires that many
// simultaneous Auth+DB round-trips, which is what makes a small Supabase project feel slow.
const publicClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LoginStats = { jobs_count: number; assets_count: number; designer_count: number; manager_count: number };

export const getCachedLoginStats = unstable_cache(
  async (): Promise<LoginStats> => {
    const { data } = await publicClient.rpc('get_login_stats').single<LoginStats>();
    return data ?? { jobs_count: 0, assets_count: 0, designer_count: 0, manager_count: 0 };
  },
  ['login-stats'],
  { revalidate: 20, tags: ['login-stats'] }
);

export const getCachedDepartmentStatus = unstable_cache(
  async (): Promise<'open' | 'busy' | 'over'> => {
    const { data } = await publicClient
      .from('department_status')
      .select('status')
      .single<{ status: 'open' | 'busy' | 'over' }>();
    return data?.status ?? 'open';
  },
  ['dept-status-public'],
  { revalidate: 20, tags: ['dept-status'] }
);
