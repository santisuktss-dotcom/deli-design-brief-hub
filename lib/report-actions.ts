'use server';

import { createClient } from '@/lib/supabase/server';

export type MonthlyReport = {
  total_projects: number;
  total_assets: number;
  dept_workload_pct: number;
  status_breakdown: Record<string, number>;
};

export async function getMonthlyReport(): Promise<MonthlyReport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_monthly_report').single<MonthlyReport>();
  if (error) return null;
  return data;
}
