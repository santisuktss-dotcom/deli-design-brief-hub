import { getCachedLoginStats, getCachedDepartmentStatus } from '@/lib/login-stats';
import LoginClient from './LoginClient';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const [stats, deptStatus] = await Promise.all([
    getCachedLoginStats(),
    getCachedDepartmentStatus(),
  ]);

  return (
    <LoginClient
      error={error ?? null}
      jobsCount={stats.jobs_count}
      assetsCount={stats.assets_count}
      designerCount={stats.designer_count}
      managerCount={stats.manager_count}
      deptStatus={deptStatus}
    />
  );
}
