import { CATS, type Brief } from './workflow';

export type BusyBrief = Pick<Brief, 'category' | 'status' | 'start_date' | 'due_date'>;

const catColor = (category: string) => CATS.find((c) => c.name === category)?.color ?? '#1A1614';

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Every ISO date a brief "occupies" for calendar-busy purposes: its start day, its due
// day, and — for a brief actively in Design — every day strictly between the two. Shared
// between the main Calendar page and the New Brief date picker so a requester picking a
// due date sees the same picture of what the design team already has on its plate.
export function buildBusyDateColors(briefs: BusyBrief[]): Record<string, string[]> {
  const byDate: Record<string, Set<string>> = {};
  const add = (iso: string | null, color: string) => {
    if (!iso) return;
    (byDate[iso] ??= new Set()).add(color);
  };

  for (const b of briefs) {
    if (b.status === 'Cancelled') continue;
    const color = catColor(b.category);
    add(b.start_date, color);
    add(b.due_date, color);
    if (b.status === 'Design' && b.start_date && b.due_date && b.due_date > b.start_date) {
      const cur = new Date(b.start_date + 'T00:00:00');
      const end = new Date(b.due_date + 'T00:00:00');
      cur.setDate(cur.getDate() + 1);
      while (cur < end) {
        add(toISO(cur), color);
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  const result: Record<string, string[]> = {};
  for (const [iso, set] of Object.entries(byDate)) result[iso] = Array.from(set);
  return result;
}
