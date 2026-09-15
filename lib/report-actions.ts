'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

export async function resetMonth(): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('reset_month');
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}
