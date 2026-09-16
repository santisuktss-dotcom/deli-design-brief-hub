import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getLang } from '@/lib/lang';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import { decorateBrief, type Brief } from '@/lib/workflow';
import WorksFilter from '@/components/WorksFilter';

type BriefRow = Brief & {
  brief_assignments: { designer_id: string; profiles: { id: string; name: string; nickname: string | null; initials: string } | null }[];
};

export default async function WorksPage() {
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
  const briefs = all.map((b) => {
    const designers = (b.brief_assignments ?? [])
      .map((a) => a.profiles)
      .filter((p): p is NonNullable<typeof p> => !!p);
    return decorateBrief(b, designers, viewer, lang);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t.worksTitle}</h1>
        <span className="text-sm text-[var(--muted)]">
          {all.length} {t.projUnit}
        </span>
      </div>

      <WorksFilter briefs={briefs} lang={lang} />
    </div>
  );
}
