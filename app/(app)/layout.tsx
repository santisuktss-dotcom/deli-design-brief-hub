import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { signOut } from '@/lib/auth-actions';
import { getLang } from '@/lib/lang';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import NewBriefButton from '@/components/NewBriefButton';
import NotificationBell from '@/components/NotificationBell';
import NavLinks from '@/components/NavLinks';
import HeaderControls from '@/components/HeaderControls';
import { buildBusyDateColors } from '@/lib/calendar-events';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const [{ data: holidayRows }, { data: notifications }, { data: briefRows }, lang] = await Promise.all([
    supabase.from('company_holidays').select('holiday_date'),
    supabase
      .from('notifications')
      .select('id, brief_id, type, message, read, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('briefs').select('category, status, start_date, due_date'),
    getLang(),
  ]);
  const holidays = (holidayRows ?? []).map((h) => h.holiday_date);
  const busyDates = buildBusyDateColors(briefRows ?? []);
  const t = lang === 'th' ? th : en;

  const displayName = user.nickname || user.name;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--background)]/85 border-b border-black/[.06]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-wrap">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)] p-1.5 flex items-center justify-center shrink-0">
                <Image src="/brand/deli-logo-white.png" alt="deli" width={22} height={22} />
              </div>
              <div className="font-sans text-[11px] tracking-[0.14em] uppercase text-[var(--muted)] truncate hidden sm:block">
                Design Brief Hub
              </div>
            </Link>
            <NavLinks lang={lang} />
          </div>
          <div className="flex items-center gap-3 min-w-0 flex-wrap lg:flex-1 lg:justify-end">
            <HeaderControls lang={lang} />
            <NewBriefButton viewer={user} holidays={holidays} busyDates={busyDates} label={t.newBrief} lang={lang} />
            <NotificationBell notifications={notifications ?? []} lang={lang} />
            <div className="text-sm text-[var(--ink2)] truncate max-w-[220px]">
              {displayName}
              <span className="ml-2 text-xs text-[var(--muted)] font-sans uppercase">
                {user.role === 'manager' ? t.designManagerRole : user.role === 'requester' ? t.requesterRole : t.designerRole}
              </span>
            </div>
            <form action={signOut}>
              <button className="text-xs font-sans uppercase tracking-wide px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/[.04] transition">
                {t.logout}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
