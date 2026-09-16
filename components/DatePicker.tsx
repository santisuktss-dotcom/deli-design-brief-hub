'use client';

import { useState } from 'react';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import type { Lang } from '@/lib/lang';

const DOW_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DOW_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isBlocked(iso: string, holidays: string[]) {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6 || holidays.includes(iso);
}
function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < startDow; i++) {
    cells.push({ date: new Date(year, month, i - startDow + 1), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, inMonth: false });
  }
  return cells;
}

export default function DatePicker({
  name,
  label,
  defaultValue,
  holidays,
  busyDates,
  required,
  onChange,
  lang = 'en',
}: {
  name: string;
  label?: string;
  defaultValue?: string;
  holidays: string[];
  busyDates?: Record<string, string[]>;
  required?: boolean;
  onChange?: (iso: string) => void;
  lang?: Lang;
}) {
  const t = lang === 'th' ? th : en;
  const DOW = lang === 'th' ? DOW_TH : DOW_EN;
  const [value, setValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const initial = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const cells = buildMonthGrid(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }
  function pick(iso: string) {
    if (isBlocked(iso, holidays)) return;
    setValue(iso);
    onChange?.(iso);
    setOpen(false);
  }

  const display = value
    ? new Date(value + 'T00:00:00').toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : t.pickDate;

  return (
    <div className="relative">
      {label && <div className="text-xs text-[var(--muted)] mb-1">{label}</div>}
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border border-black/[.12] rounded-[14px] bg-white text-sm text-left"
      >
        <span className={`flex-1 ${value ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>{display}</span>
        <span className="w-6 h-6 rounded-lg bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)] text-xs">
          📅
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-[300px] bg-white border border-black/10 rounded-2xl shadow-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <button type="button" onClick={prevMonth} className="w-7 h-7 rounded-lg border border-black/10 text-sm">
              ‹
            </button>
            <div className="flex-1 text-center text-sm font-semibold">{monthLabel}</div>
            <button type="button" onClick={nextMonth} className="w-7 h-7 rounded-lg border border-black/10 text-sm">
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DOW.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-[var(--muted)] py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map(({ date, inMonth }) => {
              const iso = toISO(date);
              const blocked = isBlocked(iso, holidays);
              const selected = iso === value;
              const busy = busyDates?.[iso];
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={blocked}
                  onClick={() => pick(iso)}
                  className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 transition ${
                    selected
                      ? 'bg-[var(--color-brand)] text-white font-semibold'
                      : blocked
                        ? 'text-black/20 cursor-not-allowed'
                        : inMonth
                          ? 'hover:bg-black/[.06] text-[var(--ink)]'
                          : 'text-black/25 hover:bg-black/[.04]'
                  }`}
                >
                  <span>{date.getDate()}</span>
                  {/* Dots show which teams/categories already have work on this day, so a
                      requester picking a due date can see the design team's existing load —
                      same category colors as the main work calendar. */}
                  {!selected && busy && busy.length > 0 && (
                    <span className="flex gap-0.5">
                      {busy.slice(0, 3).map((color, i) => (
                        <span key={i} className="w-1 h-1 rounded-full" style={{ background: color }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[.06]">
            <button
              type="button"
              onClick={() => {
                const todayIso = toISO(new Date());
                if (!isBlocked(todayIso, holidays)) pick(todayIso);
              }}
              className="text-xs px-2.5 py-1.5 rounded-full border border-black/10 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition"
            >
              {t.todayLabel}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-ink)] text-white font-semibold"
            >
              {t.done}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
