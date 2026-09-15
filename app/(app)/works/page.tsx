import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getLang } from '@/lib/lang';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import { CATS, decorateBrief, type Brief, type CategoryName } from '@/lib/workflow';

type BriefRow = Brief & {
  brief_assignments: { designer_id: string; profiles: { id: string; name: string; nickname: string | null; initials: string } | null }[];
};

export default async function WorksPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const viewer = await getCurrentUser();
  if (!viewer) return null;

  const supabase = await createClient();
  const [{ data: rows }, lang] = await Promise.all([
    supabase
      .from('briefs')
      .select('*, brief_assignments(designer_id, profiles(id, name, nickname, initials))')
      .order('created_at', { ascending: false })
      .returns<BriefRow[]>(),
    getLang(),
  ]);
  const t = lang === 'th' ? th : en;

  const all = rows ?? [];
  const filtered = cat && cat !== 'All' ? all.filter((b) => b.category === cat) : all;

  const briefs = filtered.map((b) => {
    const designers = (b.brief_assignments ?? [])
      .map((a) => a.profiles)
      .filter((p): p is NonNullable<typeof p> => !!p);
    return decorateBrief(b, designers, viewer, lang);
  });

  const cats: (CategoryName | 'All')[] = ['All', ...CATS.map((c) => c.name)];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t.worksTitle}</h1>
        <span className="text-sm text-[var(--muted)]">
          {all.length} {t.projUnit}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {cats.map((c) => {
          const active = (cat ?? 'All') === c;
          const catInfo = CATS.find((x) => x.name === c);
          const style =
            c === 'All'
              ? undefined
              : active
                ? { background: catInfo!.color, borderColor: catInfo!.color, color: '#fff' }
                : { borderColor: catInfo!.color, color: catInfo!.ink, background: catInfo!.inkLight + '20' };
          return (
            <Link
              key={c}
              href={c === 'All' ? '/works' : `/works?cat=${encodeURIComponent(c)}`}
              style={style}
              className={`rounded-full px-3 py-1.5 text-sm border transition ${
                c === 'All'
                  ? active
                    ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                    : 'border-black/10 hover:bg-black/[.04]'
                  : 'hover:brightness-95'
              }`}
            >
              {c === 'All' ? t.allLabel : c}
            </Link>
          );
        })}
      </div>

      {briefs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/[.12] p-10 text-center text-[var(--muted)]">
          {t.noProjectsInCat}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {briefs.map((b) => (
            <Link
              key={b.id}
              href={`/projects/${b.id}`}
              className="rounded-2xl border border-black/[.08] bg-white overflow-hidden hover:-translate-y-[3px] hover:shadow-lg transition"
            >
              <div className="h-[140px] relative flex items-end p-3" style={{ background: b.cover }}>
                <span
                  className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white/90 absolute top-3 right-3"
                  style={{ color: b.stColors.fg }}
                >
                  {b.statusLabel}
                </span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: b.catColor }} />
                  <span className="font-sans text-[var(--muted)]">{b.code}</span>
                </div>
                <div className="font-semibold text-sm leading-snug">{b.title}</div>
                <div className="text-xs text-[var(--muted)]">{b.stepLabelText}</div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span>{b.designerLabel}</span>
                  <span className={b.late ? 'text-[var(--color-brand)]' : 'text-[var(--muted)]'}>
                    {b.due_date ?? t.noDeadlineYet}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
