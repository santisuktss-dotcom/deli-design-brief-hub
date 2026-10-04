'use client';

import { useState } from 'react';
import { CATS } from '@/lib/workflow';
import type { Lang } from '@/lib/lang';

type Row = { category: string; assets: number | null; due_date: string | null };

// Sized by artwork count (a project can be 1 artwork or 968), with the project count shown
// alongside. Scoped to one month of deadlines at a time: starts on the current month and
// the pills let you flip to any other month that has briefs.
// Share of the month's artworks: whole numbers from 10% up, one decimal below that so the
// small categories don't all collapse to "1%" / "0%".
function pct(part: number, total: number): string {
  if (!total || !part) return '0%';
  const v = (part / total) * 100;
  if (v >= 10) return `${Math.round(v)}%`;
  if (v < 0.1) return '<0.1%';
  return `${v.toFixed(1)}%`;
}

export default function CategoryDonut({
  rows,
  currentMonth,
  lang = 'en',
  labels,
}: {
  rows: Row[];
  currentMonth: string; // YYYY-MM
  lang?: Lang;
  labels: { byCat: string; assets: string; projUnit: string };
}) {
  const [month, setMonth] = useState(currentMonth);

  const months = Array.from(
    new Set([currentMonth, ...rows.map((r) => (r.due_date ? r.due_date.slice(0, 7) : null)).filter((m): m is string => !!m)])
  ).sort();
  const monthLabel = (key: string) =>
    new Date(`${key}-01T00:00:00`).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'short', year: 'numeric' });

  const inMonth = rows.filter((r) => r.due_date && r.due_date.slice(0, 7) === month);
  const catCounts = CATS.map((c) => {
    const inCat = inMonth.filter((r) => r.category === c.name);
    return { ...c, count: inCat.length, artworkCount: inCat.reduce((s, r) => s + (r.assets ?? 0), 0) };
  });
  const catTotal = catCounts.reduce((s, c) => s + c.artworkCount, 0);
  const stops = catCounts
    .filter((c) => c.artworkCount > 0)
    .map((c, i, list) => {
      const before = list.slice(0, i).reduce((sum, x) => sum + x.artworkCount, 0);
      return `${c.color} ${(before / catTotal) * 360}deg ${((before + c.artworkCount) / catTotal) * 360}deg`;
    });
  const gradient = stops.length ? `conic-gradient(${stops.join(',')})` : 'conic-gradient(rgba(26,22,20,.1) 0deg 360deg)';

  return (
    <div className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-4">
      {months.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {months.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonth(m)}
              className={`rounded-full px-3 py-1 text-xs border transition ${
                m === month
                  ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                  : 'border-black/10 text-[var(--ink2)] hover:bg-black/[.04]'
              }`}
            >
              {monthLabel(m)}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-1/2 aspect-square rounded-full shrink-0 mx-auto sm:mx-0" style={{ background: gradient }} />
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-sm">{labels.byCat}</h2>
            <span className="text-[10px] text-[var(--muted)]">
              {labels.assets} / {labels.projUnit}
            </span>
          </div>
          {catCounts.map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
              <span className="w-[92px] shrink-0 text-[var(--ink2)]">{c.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-black/[.06] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: catTotal ? `${(c.artworkCount / catTotal) * 100}%` : '0%', background: c.color }}
                />
              </div>
              <span className="w-11 shrink-0 text-right font-medium text-[var(--ink2)] tabular-nums">
                {pct(c.artworkCount, catTotal)}
              </span>
              <span
                className="w-14 shrink-0 text-right text-[var(--muted)] tabular-nums"
                title={`${pct(c.artworkCount, catTotal)} · ${c.artworkCount} ${labels.assets} / ${c.count} ${labels.projUnit}`}
              >
                {c.artworkCount}/{c.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
