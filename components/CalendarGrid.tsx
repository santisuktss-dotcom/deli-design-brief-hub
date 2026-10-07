'use client';

import { useState, useTransition } from 'react';
import { rescheduleBrief, rescheduleBriefStart } from '@/lib/brief-actions';
import CalendarChip, { type CalEvent } from './CalendarChip';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';

// Manager or the assigned designer can drag a "Due" chip onto a different day to re-plan
// the deadline in either direction — e.g. a designer works out they can actually deliver
// earlier than planned. The manager can also drag a "Design start" chip. Native HTML5
// drag-and-drop, so no extra library.
export default function CalendarGrid({
  weeks,
  todayIso,
  t,
  canDragBriefIds,
  canDragStartBriefIds,
}: {
  weeks: { iso: string; date: number; inMonth: boolean; events: CalEvent[]; holiday: boolean }[];
  todayIso: string;
  t: typeof en | typeof th;
  canDragBriefIds: Set<string>;
  canDragStartBriefIds: Set<string>;
}) {
  const [, startTransition] = useTransition();
  const [drag, setDrag] = useState<{ id: string; kind: 'Start' | 'Due' } | null>(null);
  const [dragOverIso, setDragOverIso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDrop(iso: string) {
    setDragOverIso(null);
    const d = drag;
    setDrag(null);
    if (!d) return;
    setError(null);
    startTransition(async () => {
      const result = d.kind === 'Start' ? await rescheduleBriefStart(d.id, iso) : await rescheduleBrief(d.id, iso);
      if ('error' in result) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-xl px-3 py-2">{error}</div>
      )}
      <div className="grid grid-cols-5 gap-2">
        {weeks.map(({ iso, date, inMonth, events, holiday }) => {
          const visible = events.slice(0, 3);
          const hidden = events.slice(3);
          const isDragOver = dragOverIso === iso;
          return (
            <div
              key={iso}
              onDragOver={(ev) => {
                if (drag) {
                  ev.preventDefault();
                  if (dragOverIso !== iso) setDragOverIso(iso);
                }
              }}
              onDragLeave={() => setDragOverIso((cur) => (cur === iso ? null : cur))}
              onDrop={(ev) => {
                ev.preventDefault();
                handleDrop(iso);
              }}
              className={`min-h-[110px] rounded-2xl p-2 flex flex-col gap-1.5 border transition-colors ${
                isDragOver
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5'
                  : iso === todayIso
                    ? 'border-[var(--color-brand)]'
                    : 'border-black/[.06]'
              } ${inMonth ? 'bg-[var(--wash,rgba(26,22,20,.02))]' : 'bg-black/[.015]'} ${
                holiday ? '!border-[var(--color-brand)] bg-[repeating-linear-gradient(135deg,rgba(227,32,43,.12)_0_3px,rgba(227,32,43,.04)_3px_9px)]' : ''
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`text-xs font-medium ${inMonth ? 'text-[var(--ink2)]' : 'text-[var(--muted2)]'}`}>
                  {date}
                </span>
                {holiday && (
                  <span className="text-[10px] font-semibold rounded-full bg-[var(--color-brand)] px-2 py-0.5 text-white">
                    {t.calHoliday}
                  </span>
                )}
              </span>
              {visible.map((e, i) => {
                const draggable =
                  (e.kind === 'Due' && canDragBriefIds.has(e.brief.id)) ||
                  (e.kind === 'Start' && canDragStartBriefIds.has(e.brief.id));
                return (
                  <CalendarChip
                    key={`${e.brief.id}-${e.kind}-${i}`}
                    e={e}
                    t={t}
                    draggable={draggable}
                    onDragStart={(ev) => {
                      setDrag({ id: e.brief.id, kind: e.kind === 'Start' ? 'Start' : 'Due' });
                      ev.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setDragOverIso(null);
                    }}
                  />
                );
              })}
              {hidden.length > 0 && (
                <details>
                  <summary className="text-[10px] text-[var(--muted)] px-1 cursor-pointer">
                    +{hidden.length} {t.moreLabel}
                  </summary>
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    {hidden.map((e, i) => {
                      const draggable =
                  (e.kind === 'Due' && canDragBriefIds.has(e.brief.id)) ||
                  (e.kind === 'Start' && canDragStartBriefIds.has(e.brief.id));
                      return (
                        <CalendarChip
                          key={`${e.brief.id}-${e.kind}-${i}`}
                          e={e}
                          t={t}
                          draggable={draggable}
                          onDragStart={(ev) => {
                            setDrag({ id: e.brief.id, kind: e.kind === 'Start' ? 'Start' : 'Due' });
                            ev.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDrag(null);
                            setDragOverIso(null);
                          }}
                        />
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
