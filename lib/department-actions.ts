'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type DeptStatus = 'open' | 'busy' | 'over';

export async function getDepartmentStatus(): Promise<DeptStatus> {
  const supabase = await createClient();
  const { data } = await supabase.from('department_status').select('status').single<{ status: DeptStatus }>();
  return data?.status ?? 'open';
}

export async function setDepartmentStatus(status: DeptStatus): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_department_status', { p_status: status });
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}
