import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getLang } from '@/lib/lang';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import { type Brief } from '@/lib/workflow';
import CalendarGrid from '@/components/CalendarGrid';
import type { CalEvent } from '@/components/CalendarChip';

const DOW_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DOW_TH = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Mon–Fri only grid spanning full weeks that cover the given month, matching the
// prototype's 5-column Calendar layout (weekends carry no work, so they're hidden here
// rather than shown empty).
function buildWeekdayGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstDow = (first.getDay() + 6) % 7; // 0 = Mon
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstDow);
  const lastDow = (last.getDay() + 6) % 7;
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + (4 - lastDow));

  const days: Date[] = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const { y, m } = await searchParams;
  const viewer = await getCurrentUser();
  if (!viewer) return null;
  const lang = await getLang();
  const t = lang === 'th' ? th : en;
  const DOW = lang === 'th' ? DOW_TH : DOW_EN;

  const now = new Date();
  const year = y ? parseInt(y, 10) : now.getFullYear();
  const month = m ? parseInt(m, 10) - 1 : now.getMonth(); // 0-11

  const days = buildWeekdayGrid(year, month);
  const rangeStart = toISO(days[0]);
  const rangeEnd = toISO(days[days.length - 1]);

  // Fetched unfiltered (this is a small internal team's dataset) rather than trying to
  // express "date range overlaps the visible month" as a PostgREST .or() string — that
  // filter also has to catch a brief whose start/due span the whole visible month without
  // either endpoint falling inside it, which the previous exact-match version missed.
  const supabase = await createClient();
  const [{ data: rows }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from('briefs')
      .select('id, code, title, category, status, start_date, due_date, original_due_date')
      .neq('status', 'Cancelled')
      .returns<
        Pick<Brief, 'id' | 'code' | 'title' | 'category' | 'status' | 'start_date' | 'due_date' | 'original_due_date'>[]
      >(),
    // Only needed to know which "Due" chips a designer viewer is allowed to drag —
    // skipped for manager/requester, who don't need it (manager can drag everything).
    viewer.role === 'designer'
      ? supabase.from('brief_assignments').select('brief_id').eq('designer_id', viewer.id)
      : Promise.resolve({ data: null as { brief_id: string }[] | null }),
  ]);

  // Manager can drag any brief's due date; a designer only the briefs assigned to them;
  // a requester can't drag at all (they get update_brief_scope's forward-only editor
  // instead, on Project Detail).
  const canDragBriefIds = new Set<string>(
    viewer.role === 'manager'
      ? (rows ?? []).map((b) => b.id)
      : (assignmentRows ?? []).map((a) => a.brief_id)
  );

  const todayIso = toISO(now);

  // A requester ("Other Department") always sees the deadline frozen at whatever was
  // originally agreed, never the manager/designer's internal drag-to-reschedule working
  // date — see reschedule_brief (0031) vs original_due_date (0033).
  const byDate: Record<string, CalEvent[]> = {};
  for (const b of rows ?? []) {
    const dueIso = viewer.role === 'requester' ? b.original_due_date : b.due_date;
    if (b.start_date && b.start_date >= rangeStart && b.start_date <= rangeEnd) {
      (byDate[b.start_date] ??= []).push({ kind: 'Start', brief: b });
    }
    if (dueIso && dueIso >= rangeStart && dueIso <= rangeEnd) {
      (byDate[dueIso] ??= []).push({ kind: 'Due', brief: b });
    }
    // Only mark today's cell as "in progress" (instead of every day in the start..due
    // span) — one obvious marker for what's actively being worked on right now, rather
    // than the same chip repeated across the whole month.
    if (
      b.status === 'Design' &&
      b.start_date &&
      dueIso &&
      dueIso > b.start_date &&
      todayIso > b.start_date &&
      todayIso < dueIso &&
      todayIso >= rangeStart &&
      todayIso <= rangeEnd
    ) {
      (byDate[todayIso] ??= []).push({ kind: 'InProgress', brief: b });
    }
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
  const prev = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  const next = month === 11 ? { y: year + 1, m: 1 } : { y: year, m: month + 2 };
  const weeks = days.map((d) => {
    const iso = toISO(d);
    return { iso, date: d.getDate(), inMonth: d.getMonth() === month, events: byDate[iso] ?? [] };
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-3xl font-bold">{t.calendar}</h1>
        <p className="text-sm text-[var(--muted)]">{t.calSub}</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap justify-center">
        <span className="flex items-center gap-1.5 text-xs text-[var(--ink2)]">
          <span className="w-3 h-3 rounded border-2 border-black/30" /> {t.calStart}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[var(--ink2)]">
          <span className="w-3 h-3 rounded bg-black/30" /> {t.calDue}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[var(--ink2)]">
          <span className="w-3 h-3 rounded border-2 border-dashed border-black/30" /> {t.calInProgress}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[var(--ink2)]">
          <span
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white"
            style={{ background: 'oklch(0.5 0.13 156)' }}
          >
            ✓
          </span>
          {t.calCompleted}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/calendar?y=${prev.y}&m=${prev.m}`}
          className="w-9 h-9 flex items-center justify-center rounded-2xl border border-black/10 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition"
        >
          ‹
        </Link>
        <div className="min-w-[160px] text-center text-sm font-semibold">{monthLabel}</div>
        <Link
          href={`/calendar?y=${next.y}&m=${next.m}`}
          className="w-9 h-9 flex items-center justify-center rounded-2xl border border-black/10 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition"
        >
          ›
        </Link>
      </div>

      <div className="w-full rounded-[20px] border border-black/[.08] bg-white p-5">
        <div className="grid grid-cols-5 gap-2 mb-2">
          {DOW.map((w) => (
            <div key={w} className="text-center text-xs font-semibold tracking-wide text-[var(--muted2)] py-1">
              {w}
            </div>
          ))}
        </div>
        <CalendarGrid weeks={weeks} todayIso={todayIso} t={t} canDragBriefIds={canDragBriefIds} />
      </div>
    </div>
  );
}
