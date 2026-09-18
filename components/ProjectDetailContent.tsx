import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getLang } from '@/lib/lang';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import { decorateBrief, type Brief } from '@/lib/workflow';
import ProjectActions from '@/components/ProjectActions';

// Shared by the full-page route (app/(app)/projects/[id]/page.tsx) and the calendar's
// modal preview (app/(app)/@modal/(.)projects/[id]/page.tsx) — one data-fetch + render
// path so the two never drift apart. `compact` drops the two-column desktop layout for
// the modal, since that grid's lg: breakpoint is keyed to viewport width, not the modal's
// own (narrower) width, and would otherwise squeeze two columns into a small box.
export default async function ProjectDetailContent({ id, compact }: { id: string; compact?: boolean }) {
  const viewer = await getCurrentUser();
  if (!viewer) return null;

  const supabase = await createClient();

  const [{ data: brief }, { data: assignmentRows }, { data: history }, { data: files }, { data: submissions }, { data: comments }, lang] =
    await Promise.all([
      supabase.from('briefs').select('*').eq('id', id).single<Brief>(),
      supabase
        .from('brief_assignments')
        .select('designer_id, profiles(id, name, nickname, initials)')
        .eq('brief_id', id)
        .returns<{ designer_id: string; profiles: { id: string; name: string; nickname: string | null; initials: string } | null }[]>(),
      supabase.from('brief_history').select('*').eq('brief_id', id).order('created_at', { ascending: true }),
      supabase.from('brief_files').select('*').eq('brief_id', id).order('created_at', { ascending: true }),
      supabase.from('brief_submissions').select('id').eq('brief_id', id).limit(1),
      supabase.from('brief_comments').select('*').eq('brief_id', id).order('created_at', { ascending: true }),
      getLang(),
    ]);
  const t = lang === 'th' ? th : en;

  if (!brief) notFound();

  // Selected Works/Overview now show every brief to everyone (per manager request), but
  // full detail — history, files, comments, submissions — stays restricted: manager and
  // any designer can view everything, a requester only their own briefs. RLS on the
  // sub-tables already blocks the underlying rows for an unauthorized requester; this is
  // the friendly page-level message for that case.
  const canViewDetail = viewer.role !== 'requester' || brief.requester_id === viewer.id;
  if (!canViewDetail) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-xl font-semibold">{t.restrictedTitle}</h1>
        <p className="text-sm text-[var(--muted)] max-w-sm">{t.restrictedBody}</p>
        <Link href="/works" className="text-sm text-[var(--color-brand)] hover:underline">
          {t.backToWorks}
        </Link>
      </div>
    );
  }

  const designers = (assignmentRows ?? [])
    .map((a) => a.profiles)
    .filter((p): p is NonNullable<typeof p> => !!p);

  const deco = decorateBrief(brief, designers, viewer, lang);

  let allDesigners: { id: string; name: string; nickname: string | null; initials: string }[] = [];
  let holidays: string[] = [];
  if (viewer.role === 'manager') {
    const { data } = await supabase.from('profiles').select('id, name, nickname, initials').in('role', ['designer', 'manager']);
    allDesigners = data ?? [];
  }
  // Requester needs holidays too now, to block weekends/company holidays when pushing
  // their own brief's deadline out (see update_brief_scope).
  if (viewer.role === 'manager' || deco.isMine) {
    const { data: holidayRows } = await supabase.from('company_holidays').select('holiday_date');
    holidays = (holidayRows ?? []).map((h) => h.holiday_date);
  }

  return (
    <div className="flex flex-col gap-8">
      <section
        className={`rounded-2xl overflow-hidden relative flex flex-col items-center justify-center text-center p-6 ${compact ? 'h-[160px]' : 'h-[240px]'}`}
        style={{ background: deco.cover }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative z-10 flex flex-col items-center gap-2 text-white">
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{ background: '#fff', color: deco.stColors.fg }}
          >
            {deco.statusLabel}
          </span>
          <h1 className={compact ? 'text-xl font-bold' : 'text-2xl sm:text-3xl font-bold'}>{deco.title}</h1>
        </div>
      </section>

      <div className={compact ? 'flex flex-col gap-6' : 'grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8'}>
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-3">
            <h2 className="font-semibold">{t.briefLabel}</h2>
            <p className="text-sm text-[var(--ink2)] whitespace-pre-wrap">{deco.brief_text || '—'}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {deco.deliverable && <Chip label={`${t.fDeliv}: ${deco.deliverable}`} />}
              {deco.channel && <Chip label={`${t.fChannel}: ${deco.channel}`} />}
              {deco.round && <Chip label={`${t.fRound}: ${deco.round}`} />}
            </div>
          </section>

          <section className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-3">
            <h2 className="font-semibold">{t.revHistory}</h2>
            {(history ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{t.noHistoryYet}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {(history ?? []).map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                      style={{ background: h.status_color || 'var(--muted)' }}
                    />
                    <div>
                      <div className="text-sm font-medium">{h.title}</div>
                      {h.note && <div className="text-xs text-[var(--muted)]">{h.note}</div>}
                      <div className="text-[11px] text-[var(--muted)] font-sans">
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-3">
            <h2 className="font-semibold">{t.filesLabel}</h2>
            {(files ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{t.noFiles}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {(files ?? []).map((f) =>
                  f.ext === 'IMG' ? (
                    <li key={f.id}>
                      <a href={f.url} target="_blank" rel="noreferrer">
                        <img src={f.url} alt={f.name} className="rounded-lg max-h-64 border border-black/[.08]" />
                      </a>
                    </li>
                  ) : (
                    <li key={f.id} className="text-sm">
                      <a href={f.url} target="_blank" rel="noreferrer" className="text-[var(--color-brand)] hover:underline">
                        {f.name}
                      </a>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-3">
            <h2 className="font-semibold">{t.commentsLabel}</h2>
            {(comments ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{t.noComments}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {(comments ?? []).map((c) => (
                  <li key={c.id} className="text-sm flex flex-col gap-2">
                    <div className="font-medium">{c.author_name}</div>
                    <div className="text-[var(--ink2)]">{c.text}</div>
                    {c.image_url && (
                      <a href={c.image_url} target="_blank" rel="noreferrer">
                        <img
                          src={c.image_url}
                          alt=""
                          className="rounded-lg max-h-56 border border-black/[.08]"
                        />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <ProjectActions
          brief={brief}
          deco={deco}
          viewer={viewer}
          allDesigners={allDesigners}
          currentDesignerIds={designers.map((d) => d.id)}
          hasSubmission={(submissions ?? []).length > 0}
          holidays={holidays}
          lang={lang}
        />
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="rounded-full px-2.5 py-1 bg-black/[.04] text-[var(--ink2)]">{label}</span>;
}
