// Ported verbatim from the design prototype's STATUS/ORDER/CATS/TEAM constants
// (design_handoff_deli_design_brief_hub/index.html around lines 1094-1327) so the
// client and server share one source of truth for status colors and copy.

export const RED = '#C4142F';
export const BLUE = 'oklch(0.52 0.14 250)';
export const AMBER = 'oklch(0.62 0.14 68)';
export const GREEN = 'oklch(0.5 0.13 156)';
export const INK = '#1A1614';
export const VIOLET = 'oklch(0.52 0.14 310)';

export type BriefStatus =
  | 'Brief' | 'Review' | 'Design' | 'Revision' | 'Approved' | 'Completed' | 'Cancelled' | 'OnHold';

export const ORDER: BriefStatus[] = ['Brief', 'Review', 'Design', 'Revision', 'Approved', 'Completed'];

export const STATUS: Record<BriefStatus, { bg: string; fg: string; dot: string; th: string }> = {
  Brief:     { bg: 'oklch(0.87 0.006 60)', fg: 'rgba(26,22,20,.66)', dot: 'rgba(26,22,20,.22)', th: 'รับบรีฟในองค์กร' },
  Review:    { bg: 'oklch(0.71 0.11 252)', fg: 'oklch(0.4 0.12 252)', dot: 'oklch(0.71 0.11 252)', th: 'ตรวจบรีฟ / ประเมินงาน' },
  Design:    { bg: 'oklch(0.72 0.13 22)', fg: '#8E0E22', dot: 'oklch(0.72 0.13 22)', th: 'ลงมือออกแบบ' },
  Revision:  { bg: 'oklch(0.78 0.13 76)', fg: 'oklch(0.44 0.11 62)', dot: 'oklch(0.78 0.13 76)', th: 'แก้ไขตามคอมเมนต์' },
  Approved:  { bg: 'oklch(0.74 0.11 157)', fg: 'oklch(0.4 0.11 158)', dot: 'oklch(0.74 0.11 157)', th: 'อนุมัติแล้ว' },
  Completed: { bg: 'oklch(0.84 0.006 60)', fg: 'rgba(26,22,20,.58)', dot: 'rgba(26,22,20,.3)', th: 'ส่งมอบเรียบร้อย' },
  Cancelled: { bg: 'oklch(0.9 0.02 20)', fg: '#8E0E22', dot: '#8E0E22', th: 'ยกเลิกงาน' },
  OnHold:    { bg: 'oklch(0.92 0.045 70)', fg: 'oklch(0.45 0.1 60)', dot: 'oklch(0.62 0.1 60)', th: 'พักงานชั่วคราว' },
};

// STATUS[s].dot uses grayscale for Brief/Completed (matches the badge/chip look used
// elsewhere), but some UI wants every status visually distinct instead of two shades of
// gray blending together — the workflow icon strip and the monthly report bars share
// this override for exactly that.
export const VIVID_STATUS_COLOR: Partial<Record<BriefStatus, string>> = {
  Brief: VIOLET,
  Completed: 'oklch(0.55 0.12 200)',
};

export const STATUS_NAME: Record<'th' | 'en', Record<BriefStatus, string>> = {
  th: { Brief: 'รับบรีฟ', Review: 'ตรวจบรีฟ', Design: 'ออกแบบ', Revision: 'แก้ไข', Approved: 'อนุมัติ', Completed: 'เสร็จสิ้น', Cancelled: 'ยกเลิก', OnHold: 'พักงาน' },
  en: { Brief: 'Brief', Review: 'Review', Design: 'Design', Revision: 'Revision', Approved: 'Approved', Completed: 'Completed', Cancelled: 'Cancelled', OnHold: 'On Hold' },
};

export const STAGE_TXT: Record<'th' | 'en', Record<string, string>> = {
  th: { Brief: 'รับบรีฟในองค์กร', Review: 'ตรวจบรีฟ / ประเมินงาน', Design: 'ลงมือออกแบบ', Revision: 'แก้ไขตามคอมเมนต์', Approved: 'อนุมัติแล้ว', Completed: 'ส่งมอบเรียบร้อย' },
  en: { Brief: 'Internal request', Review: 'Scope & estimate', Design: 'Design in progress', Revision: 'Client revisions', Approved: 'Signed off', Completed: 'Delivered' },
};

export type CategoryName = 'Product' | 'E-Commerce' | 'Modern Trade' | 'General Trade' | 'Corporate';

export const P = {
  red: 'oklch(0.72 0.13 22)', blue: 'oklch(0.71 0.11 252)', amber: 'oklch(0.78 0.13 76)',
  green: 'oklch(0.74 0.11 157)', violet: 'oklch(0.72 0.11 311)', gray: 'oklch(0.86 0.006 60)',
};
export const PINK_INK = {
  red: '#8E0E22', blue: 'oklch(0.44 0.12 252)', amber: 'oklch(0.5 0.15 92)',
  green: 'oklch(0.43 0.11 158)', violet: 'oklch(0.44 0.12 312)',
};
export const LIGHT_TONE = {
  red: 'oklch(0.85 0.09 22)', blue: 'oklch(0.86 0.07 250)', amber: 'oklch(0.9 0.09 78)',
  green: 'oklch(0.88 0.08 157)', violet: 'oklch(0.86 0.07 311)',
};

export const CATS: { name: CategoryName; color: string; ink: string; inkLight: string }[] = [
  { name: 'Product',       color: P.red,    ink: PINK_INK.red,    inkLight: LIGHT_TONE.red },
  { name: 'E-Commerce',    color: P.blue,   ink: PINK_INK.blue,   inkLight: LIGHT_TONE.blue },
  { name: 'Modern Trade',  color: P.amber,  ink: PINK_INK.amber,  inkLight: LIGHT_TONE.amber },
  { name: 'General Trade', color: P.violet, ink: PINK_INK.violet, inkLight: LIGHT_TONE.violet },
  { name: 'Corporate',     color: P.green,  ink: PINK_INK.green,  inkLight: LIGHT_TONE.green },
];

const cover = (a: string, b: string) => `linear-gradient(135deg,${a},${b})`;
export const COVER: Record<CategoryName, string> = {
  'Product': cover('oklch(0.76 0.11 24)', 'oklch(0.66 0.14 16)'),
  'E-Commerce': cover('oklch(0.76 0.1 251)', 'oklch(0.66 0.12 254)'),
  'Modern Trade': cover('oklch(0.82 0.11 80)', 'oklch(0.73 0.13 70)'),
  'General Trade': cover('oklch(0.76 0.1 311)', 'oklch(0.67 0.12 314)'),
  'Corporate': cover('oklch(0.79 0.1 157)', 'oklch(0.7 0.12 160)'),
};

// Team composition is fixed at 3 people per README; capacity is configurable per
// person in team_capacity_defaults, this is just the display fallback.
export const TEAM_ROLE_LABEL = {
  manager: (pct: number) => `Creative & Design Manager · ${pct}%`,
  designer: (label: string, pct: number) => `${label} · ${pct}%`,
};

export function stepBadge(status: BriefStatus): string {
  const i = ORDER.indexOf(status);
  return i > -1 ? `0${i + 1}/0${ORDER.length}` : status;
}

export function stepLabel(status: BriefStatus, lang: 'th' | 'en'): string {
  const i = ORDER.indexOf(status);
  return `${i + 1}/${ORDER.length} · ${STATUS_NAME[lang][status]}`;
}

export type Role = 'manager' | 'designer' | 'requester';

export type Brief = {
  id: string;
  code: string;
  title: string;
  category: CategoryName;
  status: BriefStatus;
  requester_id: string | null;
  requester_email: string;
  requester_name: string;
  brief_text: string | null;
  deliverable: string | null;
  channel: string | null;
  round: number | null;
  assets: number;
  assets_done: number;
  start_date: string | null;
  due_date: string | null;
  original_due_date: string | null;
  delivery_timing: 'early' | 'ontime' | 'late' | null;
  accepted: boolean;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssignedDesigner = { id: string; name: string; nickname: string | null; initials: string };

// Ported from the prototype's deco() (index.html ~line 1927), simplified because our
// RPCs make `status`/`accepted` server-authoritative — no client-side status override needed.
export function decorateBrief(
  brief: Brief,
  designers: AssignedDesigner[],
  viewer: { id: string; role: Role },
  lang: 'th' | 'en' = 'en'
) {
  // Review is where an accepted-but-unassigned brief now sits (see accept_brief RPC),
  // so the gate checklist (accepted / designer assigned) must stay visible through it too.
  const gated = brief.status === 'Brief' || brief.status === 'Review';
  const isAccepted = gated ? brief.accepted : true;
  const started = isAccepted && designers.length > 0;
  const canAccept = viewer.role === 'manager' && !brief.accepted && brief.status === 'Brief';
  const canAssign = viewer.role === 'manager' && brief.accepted;
  const isMine = viewer.role === 'requester' && brief.requester_id === viewer.id;
  const canCancelHold = isMine && gated && !brief.accepted;
  const cat = CATS.find((c) => c.name === brief.category);
  // The manager/designer can drag "Due" around the calendar for their own internal
  // re-planning (reschedule_brief) without that ever moving the deadline the requester
  // was originally told — a requester always sees original_due_date, frozen since
  // creation (or their own deliberate update_brief_scope push), never the working date.
  // Falls back to due_date when original_due_date is missing — covers the window before
  // migration 0033 has been run (column doesn't exist yet / isn't backfilled), so a
  // requester never sees a deadline vanish just because the DB hasn't caught up yet.
  const displayDueDate = viewer.role === 'requester' ? brief.original_due_date ?? brief.due_date : brief.due_date;
  // "Late" styling follows whichever date this viewer actually sees, so a requester's
  // red/muted color always matches the frozen date shown next to it.
  const late =
    !!displayDueDate &&
    brief.status !== 'Completed' &&
    brief.status !== 'Cancelled' &&
    new Date(displayDueDate) < new Date();

  return {
    ...brief,
    statusLabel: STATUS_NAME[lang][brief.status],
    stepBadgeText: stepBadge(brief.status),
    stepLabelText: stepLabel(brief.status, lang),
    stColors: STATUS[brief.status],
    cover: COVER[brief.category] || COVER.Product,
    catColor: cat?.color || INK,
    gated,
    isAccepted,
    started,
    canAccept,
    canAssign,
    canCancelHold,
    isMine,
    displayDueDate,
    designers,
    designerLabel: designers.length
      ? designers.map((d) => d.nickname || d.name).join(' + ')
      : lang === 'th' ? 'ยังไม่มอบหมาย' : 'Unassigned',
    late,
  };
}

export type DecoratedBrief = ReturnType<typeof decorateBrief>;

// Ported from the prototype's capacity-level rows (index.html ~1473-1479), now used to
// render the manually-set Department Status (no calculated % — manager clicks to change it).
export const DEPT_STATUS_META: Record<
  'open' | 'busy' | 'over',
  { th: string; en: string; gif: string; color: string; fg: string; bg: string }
> = {
  open: { th: 'ว่าง รับบรีฟได้', en: 'Open for briefs', gif: '/brand/level-open.gif', color: GREEN, fg: 'oklch(0.43 0.11 158)', bg: 'oklch(0.88 0.08 157 / .35)' },
  busy: { th: 'งานแน่น แต่ยังรับ', en: 'Busy · still available', gif: '/brand/level-busy.gif', color: 'oklch(0.68 0.19 45)', fg: 'oklch(0.5 0.15 92)', bg: 'oklch(0.9 0.09 78 / .35)' },
  over: { th: 'งานล้น/งานชนกัน', en: 'Overload · Overlaps', gif: '/brand/level-over.gif', color: RED, fg: '#8E0E22', bg: 'rgba(196,20,47,.15)' },
};
