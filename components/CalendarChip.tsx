import Link from 'next/link';
import type { DragEvent } from 'react';
import { CATS, type Brief } from '@/lib/workflow';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';

export const catColor = (category: string) => CATS.find((c) => c.name === category)?.color ?? '#1A1614';
export const catInk = (category: string) => CATS.find((c) => c.name === category)?.ink ?? '#1A1614';
export const catLight = (category: string) => CATS.find((c) => c.name === category)?.inkLight ?? '#eee';

export type CalBrief = Pick<Brief, 'id' | 'code' | 'title' | 'category' | 'status' | 'start_date' | 'due_date'>;
export type CalEvent = { kind: 'Start' | 'Due' | 'InProgress'; brief: CalBrief };

// Shared between the server-rendered calendar page and the client-side drag-and-drop grid
// (CalendarGrid), so the chip markup never drifts between the two.
export default function CalendarChip({
  e,
  t,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  e: CalEvent;
  t: typeof en | typeof th;
  draggable?: boolean;
  onDragStart?: (ev: DragEvent) => void;
  onDragEnd?: (ev: DragEvent) => void;
}) {
  const ink = catInk(e.brief.category);
  const kindLabel = e.kind === 'Start' ? t.calStart : e.kind === 'Due' ? t.calDue : t.calInProgress;
  // Previously only the "Due" chip got the checkmark, so a completed brief's "Design
  // start" chip (visible whenever its start date is also on screen) looked unfinished
  // even though the job is done — now every chip for a completed brief shows it.
  const isCompleted = e.brief.status === 'Completed';
  return (
    <Link
      href={`/projects/${e.brief.id}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`relative rounded-lg px-1.5 py-1 flex flex-col gap-0.5 hover:brightness-95 transition ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{
        // The calendar legend promises Start = outline only, Due = filled, In Progress =
        // dashed outline — but Start was also getting Due's filled background on top of
        // its border, so the two looked almost identical at a glance. Matching the legend
        // for real makes Due (the one date that matters most) the only solid chip.
        background: e.kind === 'Due' ? catLight(e.brief.category) : 'transparent',
        border:
          e.kind === 'Due'
            ? undefined
            : `1.5px ${e.kind === 'InProgress' ? 'dashed' : 'solid'} ${catColor(e.brief.category)}`,
      }}
    >
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
}
