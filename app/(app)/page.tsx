import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getDepartmentStatus } from '@/lib/department-actions';
import { getLang } from '@/lib/lang';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import { ORDER, STATUS_NAME, STAGE_TXT, STATUS, CATS, VIVID_STATUS_COLOR, decorateBrief, type Brief } from '@/lib/workflow';
import DepartmentStatusWidget from '@/components/DepartmentStatusWidget';
import MonthlyReportButton from '@/components/MonthlyReportButton';

const WF_ICON: Record<string, string> = {
  Brief: '/brand/wf-brief.png',
  Review: '/brand/wf-review.png',
  Design: '/brand/wf-design.png',
  Revision: '/brand/wf-revision.png',
  Approved: '/brand/wf-approved.png',
  Completed: '/brand/wf-completed.png',
};

type BriefRow = Brief & {
  brief_assignments: { designer_id: string; profiles: { id: string; name: string; nickname: string | null; initials: string } | null }[];
};

export default async function OverviewPage() {
  const viewer = await getCurrentUser();
  if (!viewer) return null;

  const supabase = await createClient();

  const [{ data: rows }, deptStatus, lang] = await Promise.all([
    supabase
      .from('briefs')
      .select('*, brief_assignments(designer_id, profiles(id, name, nickname, initials))')
      .order('created_at', { ascending: false })
      .returns<BriefRow[]>(),
    getDepartmentStatus(),
    getLang(),
  ]);
  const t = lang === 'th' ? th : en;

  const all = rows ?? [];
  const total = all.length;
  const totalAssets = all.reduce((sum, b) => sum + (b.assets ?? 0), 0);
  const overdue = all.filter((b) => b.due_date && new Date(b.due_date) < new Date() && b.status !== 'Completed').length;

  const stageCounts: Record<string, number> = {};
  for (const name of ORDER) stageCounts[name] = 0;
  for (const b of all) {
    if (b.status in stageCounts) stageCounts[b.status] += 1;
  }

  const catCounts = CATS.map((c) => {
    const inCat = all.filter((b) => b.category === c.name);
    return { ...c, count: inCat.length, artworkCount: inCat.reduce((s, b) => s + (b.assets ?? 0), 0) };
  });
  const catTotal = catCounts.reduce((s, c) => s + c.count, 0);
  let acc = 0;
  const donutStops = catCounts
    .filter((c) => c.count > 0)
    .map((c) => {
      const start = catTotal ? (acc / catTotal) * 360 : 0;
      acc += c.count;
      const end = catTotal ? (acc / catTotal) * 360 : 0;
      return `${c.color} ${start}deg ${end}deg`;
    });
  const donutGradient = donutStops.length
    ? `conic-gradient(${donutStops.join(',')})`
    : 'conic-gradient(rgba(26,22,20,.1) 0deg 360deg)';

  const featured = all
    .filter((b) => b.status === 'Design' || b.status === 'Review')
    .slice(0, 3)
    .map((b) => {
      const designers = (b.brief_assignments ?? []).map((a) => a.profiles).filter((p): p is NonNullable<typeof p> => !!p);
      return decorateBrief(b, designers, viewer, lang);
    });

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="rounded-[20px] bg-[var(--color-brand)] text-white p-6 sm:p-10 flex flex-wrap gap-8 items-center">
        <div className="flex-1 min-w-[260px]">
          <div className="font-sans text-xs tracking-[0.18em] uppercase opacity-80">{t.overview}</div>
          <h1 className="text-3xl sm:text-4xl font-bold mt-2 max-w-[520px]">Design Brief Hub</h1>
          <p className="mt-3 opacity-90 max-w-[520px] text-sm sm:text-base">{t.heroBody}</p>
          <Link
            href="/works"
            className="inline-block mt-4 rounded-full bg-white text-[var(--color-brand)] text-sm font-semibold px-4 py-2 hover:bg-white/90 transition"
          >
            {t.viewAllWork}
          </Link>
        </div>
        <div className="flex gap-6 sm:gap-8 flex-wrap">
          <HeroStat value={total} label={t.statAll} />
          <HeroDivider />
          <HeroStat value={totalAssets} label={t.totalArtworks} />
          <HeroDivider />
          <HeroStat value={stageCounts.Design} label={t.statDesign} />
          <HeroDivider />
          <HeroStat value={stageCounts.Review} label={t.statReview} />
          <HeroDivider />
          <HeroStat value={overdue} label={t.statLate} alert />
        </div>
      </section>

      {/* Workflow strip */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold">{t.wfTitle}</h2>
          <span className="text-sm text-[var(--muted)]">{t.wfSub}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ORDER.map((name, i) => (
            <div key={name} className="rounded-2xl border border-black/[.08] bg-white p-4 flex flex-col items-center text-center gap-1">
              <span
                aria-hidden
                className="w-16 h-16 mb-2"
                style={{
                  background: VIVID_STATUS_COLOR[name] ?? STATUS[name].dot,
                  WebkitMaskImage: `url(${WF_ICON[name]})`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskImage: `url(${WF_ICON[name]})`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                }}
              />
              <div className="font-sans text-xs text-[var(--muted)]">0{i + 1}</div>
              <div className="font-semibold text-sm">{STATUS_NAME[lang][name]}</div>
              <div className="text-xs text-[var(--muted)]">{STAGE_TXT[lang][name]}</div>
              <div className="font-display text-2xl font-bold mt-1 tabular-nums">{stageCounts[name]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Workload donut + Department Status */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div
              className="w-1/2 aspect-square rounded-full shrink-0 mx-auto sm:mx-0"
              style={{ background: donutGradient }}
            />
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold text-sm">{t.byCat}</h2>
                <span className="text-[10px] text-[var(--muted)]">
                  {t.projUnit} / {t.assets}
                </span>
              </div>
              {catCounts.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="w-[92px] shrink-0 text-[var(--ink2)]">{c.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-black/[.06] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: catTotal ? `${(c.count / catTotal) * 100}%` : '0%', background: c.color }}
                    />
                  </div>
                  <span
                    className="w-12 shrink-0 text-right text-[var(--muted)] tabular-nums"
                    title={`${c.count} ${t.projUnit} / ${c.artworkCount} ${t.assets}`}
                  >
                    {c.count}/{c.artworkCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {viewer.role === 'manager' && (
            <div className="flex justify-end">
              <MonthlyReportButton label={t.reportBtn} lang={lang} />
            </div>
          )}
        </div>

        <DepartmentStatusWidget status={deptStatus} isManager={viewer.role === 'manager'} lang={lang} />
      </section>

      {total === 0 ? (
        <section className="rounded-2xl border border-dashed border-black/[.12] p-10 text-center text-[var(--muted)]">
          {t.noBriefsYet}
        </section>
      ) : (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold">{t.worksTitle}</h2>
            <Link href="/works" className="text-sm text-[var(--color-brand)] hover:underline">
              {t.portfolioAll}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((b) => (
              <Link
                key={b.id}
                href={`/projects/${b.id}`}
                className="rounded-2xl border border-black/[.08] bg-white overflow-hidden hover:-translate-y-[3px] hover:shadow-lg transition"
              >
                <div className="h-[120px] relative" style={{ background: b.cover }}>
                  <span
                    className="text-sm font-semibold px-3 py-1.5 rounded-full bg-white/90 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ color: b.stColors.fg }}
                  >
                    {b.statusLabel}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <div className="font-sans text-xs text-[var(--muted)]">{b.code}</div>
                  <div className="font-semibold text-sm">{b.title}</div>
                  <div className="text-xs text-[var(--muted)]">{b.stepLabelText}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function HeroStat({ value, label, alert }: { value: number; label: string; alert?: boolean }) {
  return (
    <div className={alert && value > 0 ? 'bg-white text-[var(--color-brand)] rounded-lg px-3 py-1' : ''}>
      <div className="font-display text-3xl sm:text-4xl font-bold tabular-nums">{value}</div>
      <div className="text-xs opacity-90 mt-1">{label}</div>
    </div>
  );
}

function HeroDivider() {
  return <div className="w-px bg-white/25 self-stretch" />;
}
