import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getLang } from '@/lib/lang';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import { CATS, type Brief } from '@/lib/workflow';

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

const catColor = (category: string) => CATS.find((c) => c.name === category)?.color ?? '#1A1614';
const catInk = (category: string) => CATS.find((c) => c.name === category)?.ink ?? '#1A1614';
const catLight = (category: string) => CATS.find((c) => c.name === category)?.inkLight ?? '#eee';

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
  const { data: rows } = await supabase
    .from('briefs')
    .select('id, code, title, category, status, start_date, due_date')
    .neq('status', 'Cancelled')
    .returns<Pick<Brief, 'id' | 'code' | 'title' | 'category' | 'status' | 'start_date' | 'due_date'>[]>();

  type CalEvent = { kind: 'Start' | 'Due' | 'InProgress'; brief: NonNullable<typeof rows>[number] };
  const byDate: Record<string, CalEvent[]> = {};
  for (const b of rows ?? []) {
    if (b.start_date && b.start_date >= rangeStart && b.start_date <= rangeEnd) {
      (byDate[b.start_date] ??= []).push({ kind: 'Start', brief: b });
    }
    if (b.due_date && b.due_date >= rangeStart && b.due_date <= rangeEnd) {
      (byDate[b.due_date] ??= []).push({ kind: 'Due', brief: b });
    }
    // Days strictly between start and due for a brief still being designed would
    // otherwise sit empty even though work is actively happening that day.
    if (b.status === 'Design' && b.start_date && b.due_date && b.due_date > b.start_date) {
      for (const d of days) {
        const iso = toISO(d);
        if (iso > b.start_date && iso < b.due_date) {
          (byDate[iso] ??= []).push({ kind: 'InProgress', brief: b });
        }
      }
    }
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
  const prev = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  const next = month === 11 ? { y: year + 1, m: 1 } : { y: year, m: month + 2 };

  const todayIso = toISO(now);

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
        <div className="grid grid-cols-5 gap-2">
          {days.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === month;
            const events = byDate[iso] ?? [];
            const visible = events.slice(0, 3);
            const overflow = events.length - visible.length;
            return (
              <div
                key={iso}
                className={`min-h-[110px] rounded-2xl p-2 flex flex-col gap-1.5 border ${
                  iso === todayIso ? 'border-[var(--color-brand)]' : 'border-black/[.06]'
                } ${inMonth ? 'bg-[var(--wash,rgba(26,22,20,.02))]' : 'bg-black/[.015]'}`}
              >
                <span className={`text-xs font-medium ${inMonth ? 'text-[var(--ink2)]' : 'text-[var(--muted2)]'}`}>
                  {d.getDate()}
                </span>
                {visible.map((e, i) => {
                  // InProgress spans every day of a brief's design window, so a solid
                  // fill every day reads as too heavy — outline-only in the same category
                  // color keeps it visually lighter than the single-day Start/Due markers.
                  const ink = catInk(e.brief.category);
                  const kindLabel =
                    e.kind === 'Start' ? t.calStart : e.kind === 'Due' ? t.calDue : t.calInProgress;
                  const isCompleted = e.kind === 'Due' && e.brief.status === 'Completed';
                  return (
                    <Link
                      key={`${e.brief.id}-${e.kind}-${i}`}
                      href={`/projects/${e.brief.id}`}
                      className="relative rounded-lg px-1.5 py-1 flex flex-col gap-0.5 hover:brightness-95 transition"
                      style={{
                        background: e.kind === 'InProgress' ? 'transparent' : catLight(e.brief.category),
                        border:
                          e.kind === 'Start' || e.kind === 'InProgress'
                            ? `1.5px solid ${catColor(e.brief.category)}`
                            : undefined,
                      }}
                    >
                      {/* Completed jobs get a checkmark badge on their due-date chip — the
                          calendar otherwise gives no visual signal that a due date was
                          actually met, just that one existed. */}
                      {isCompleted && (
                        <span
                          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white"
                          style={{ background: 'oklch(0.5 0.13 156)' }}
                          title={t.calCompleted}
                        >
                          ✓
                        </span>
                      )}
                      <span className="text-[9px] opacity-75" style={{ color: ink }}>
                        {kindLabel} · {e.brief.code}
                      </span>
                      <span className="text-[10.5px] font-semibold leading-snug truncate" style={{ color: ink }}>
                        {e.brief.title}
                      </span>
                    </Link>
                  );
                })}
                {overflow > 0 && (
                  <span className="text-[10px] text-[var(--muted)] px-1">
                    +{overflow} {t.moreLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
