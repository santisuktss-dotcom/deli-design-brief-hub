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
  const isCompleted = e.kind === 'Due' && e.brief.status === 'Completed';
  return (
    <Link
      href={`/projects/${e.brief.id}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`relative rounded-lg px-1.5 py-1 flex flex-col gap-0.5 hover:brightness-95 transition ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{
        background: e.kind === 'InProgress' ? 'transparent' : catLight(e.brief.category),
        border: e.kind === 'Start' || e.kind === 'InProgress' ? `1.5px solid ${catColor(e.brief.category)}` : undefined,
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
