import { createClient } from '@/lib/supabase/server';
import { getDepartmentStatus } from '@/lib/department-actions';
import LoginClient from './LoginClient';

type LoginStats = { jobs_count: number; assets_count: number; designer_count: number; manager_count: number };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: stats }, deptStatus] = await Promise.all([
    supabase.rpc('get_login_stats').single<LoginStats>(),
    getDepartmentStatus(),
  ]);

  return (
    <LoginClient
      error={error ?? null}
      jobsCount={stats?.jobs_count ?? 0}
      assetsCount={stats?.assets_count ?? 0}
      designerCount={stats?.designer_count ?? 0}
      managerCount={stats?.manager_count ?? 0}
      deptStatus={deptStatus}
    />
  );
}
