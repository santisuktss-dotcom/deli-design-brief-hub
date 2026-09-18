'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CATS, type CategoryName, type DecoratedBrief } from '@/lib/workflow';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import type { Lang } from '@/lib/lang';

// Filtering used to be URL-driven (?cat=...) via <Link> navigation, but Next's client
// router cache could serve a stale RSC payload for a previously-visited filter URL,
// leaving more than one pill looking "active" at once after clicking through a few of
// them quickly. Filtering client-side with plain useState removes the server round-trip
// (and that whole class of staleness) — the dataset here is small enough that shipping
// every brief up front and filtering in the browser is cheap.
export default function WorksFilter({ briefs, lang = 'en' }: { briefs: DecoratedBrief[]; lang?: Lang }) {
  const t = lang === 'th' ? th : en;
  const [active, setActive] = useState<CategoryName | 'All'>('All');
  const cats: (CategoryName | 'All')[] = ['All', ...CATS.map((c) => c.name)];
  const filtered = active === 'All' ? briefs : briefs.filter((b) => b.category === active);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => {
          const isActive = active === c;
          const catInfo = CATS.find((x) => x.name === c);
          const style =
            c === 'All'
              ? undefined
              : isActive
                ? { background: catInfo!.color, borderColor: catInfo!.color, color: '#fff' }
                : { borderColor: catInfo!.color, color: catInfo!.ink, background: catInfo!.inkLight + '20' };
          return (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              style={style}
              className={`rounded-full px-3 py-1.5 text-sm border transition ${
                c === 'All'
                  ? isActive
                    ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                    : 'border-black/10 hover:bg-black/[.04]'
                  : 'hover:brightness-95'
              }`}
            >
              {c === 'All' ? t.allLabel : c}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/[.12] p-10 text-center text-[var(--muted)]">
          {t.noProjectsInCat}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <Link
              key={b.id}
              href={`/projects/${b.id}`}
              className="rounded-2xl border border-black/[.08] bg-white overflow-hidden hover:-translate-y-[3px] hover:shadow-lg transition"
            >
              <div className="h-[140px] relative flex items-end p-3" style={{ background: b.cover }}>
                <span
                  className="text-sm font-semibold px-3 py-1.5 rounded-full bg-white/90 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
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
                    {b.displayDueDate ?? t.noDeadlineYet}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
