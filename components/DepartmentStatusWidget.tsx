'use client';

import { useTransition } from 'react';
import Image from 'next/image';
import { setDepartmentStatus, type DeptStatus } from '@/lib/department-actions';
import { DEPT_STATUS_META } from '@/lib/workflow';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import type { Lang } from '@/lib/lang';

const ROWS: DeptStatus[] = ['open', 'busy', 'over'];

export default function DepartmentStatusWidget({
  status,
  isManager,
  lang = 'en',
}: {
  status: DeptStatus;
  isManager: boolean;
  lang?: Lang;
}) {
  const [pending, startTransition] = useTransition();
  const orderedRows = [status, ...ROWS.filter((k) => k !== status)];
  const t = lang === 'th' ? th : en;

  return (
    <section className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-sm">{t.deptTitle}</h2>
        {isManager && <span className="text-[11px] text-[var(--muted)]">{t.clickToUpdate}</span>}
      </div>
      <div className="flex flex-col gap-2">
        {orderedRows.map((key) => {
          const meta = DEPT_STATUS_META[key];
          const active = status === key;
          const Row = isManager ? 'button' : 'div';
          return (
            <Row
              key={key}
              disabled={isManager ? pending : undefined}
              onClick={
                isManager
                  ? () =>
                      startTransition(async () => {
                        await setDepartmentStatus(key);
                      })
                  : undefined
              }
              className={`relative flex items-center rounded-2xl pl-8 pr-4 py-5 text-left transition ${
                isManager ? 'cursor-pointer' : ''
              } ${active ? '' : 'opacity-60'}`}
              style={{
                // Solid tint (not a translucent bg meant for a light page) so text stays
                // readable regardless of light/dark theme — only the active row gets it,
                // the other two stay muted.
                background: active ? meta.color : 'var(--wash2, rgba(26,22,20,.04))',
                border: `1px solid ${active ? meta.color : 'transparent'}`,
              }}
            >
              <Image src={meta.gif} alt="" width={160} height={160} unoptimized className="shrink-0" />
              <span
                className="absolute inset-0 flex items-center justify-center translate-x-10 text-lg font-semibold pointer-events-none"
                style={{ color: active ? '#fff' : 'var(--ink2)' }}
              >
                {meta[lang]}
              </span>
              {active && (
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/25"
                  style={{ color: '#fff' }}
                >
                  {lang === 'th' ? 'ปัจจุบัน' : 'Current'}
                </span>
              )}
            </Row>
          );
        })}
      </div>
    </section>
  );
}
