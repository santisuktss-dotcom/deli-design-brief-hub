'use server';

import { createClient } from '@/lib/supabase/server';
import { buildBusyDateColors } from '@/lib/calendar-events';

// Was previously fetched inside app/(app)/layout.tsx on every single page navigation
// (holidays + every brief's dates, just to color the New Brief date picker's "busy days"
// overlay) even though most page views never open that modal at all. Fetching it lazily,
// only when the button is actually clicked, keeps every other page load off this query.
export async function getNewBriefFormData() {
  const supabase = await createClient();
  const [{ data: holidayRows }, { data: briefRows }] = await Promise.all([
    supabase.from('company_holidays').select('holiday_date'),
    supabase.from('briefs').select('category, status, start_date, due_date'),
  ]);
  return {
    holidays: (holidayRows ?? []).map((h) => h.holiday_date),
    busyDates: buildBusyDateColors(briefRows ?? []),
  };
}
