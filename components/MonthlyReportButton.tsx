'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { getMonthlyReport, resetMonth, type MonthlyReport } from '@/lib/report-actions';
import { ORDER, STATUS_NAME, STATUS } from '@/lib/workflow';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import type { Lang } from '@/lib/lang';

export default function MonthlyReportButton({ label, lang = 'en' }: { label?: string; lang?: Lang }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = lang === 'th' ? th : en;

  function openReport() {
    setOpen(true);
    setConfirming(false);
    setError(null);
    startTransition(async () => {
      const r = await getMonthlyReport();
      setReport(r);
    });
  }

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  function downloadCsv() {
    if (!report) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Projects', String(report.total_projects)],
      ['Total Artworks', String(report.total_assets)],
      ['Dept Workload %', String(report.dept_workload_pct)],
      [],
      ['Status', 'Count'],
      ...ORDER.map((s) => [STATUS_NAME.en[s], String(report.status_breakdown[s] ?? 0)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deli-monthly-report-${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setError(null);
    startTransition(async () => {
      const result = await resetMonth();
      if ('error' in result) setError(result.error);
      else close();
    });
  }

  return (
    <>
      <button
        onClick={openReport}
        className="sweep-shine text-xs font-sans uppercase tracking-wide px-4 py-2 rounded-full bg-[var(--color-ink)] text-white hover:opacity-90 transition"
      >
        {label ?? t.reportBtn}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={close}>
          <div
            className="bg-[var(--color-surface)] rounded-2xl max-w-lg w-full p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.reportTitle}</h2>
              <button onClick={close} className="text-[var(--muted)] hover:text-[var(--ink)]">
                ✕
              </button>
            </div>

            {!report ? (
              <p className="text-sm text-[var(--muted)]">{pending ? '…' : ''}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label={t.reportProjects} value={report.total_projects} />
                  <Stat label={t.reportAssets} value={report.total_assets} />
                  <Stat label={t.reportLoad} value={`${report.dept_workload_pct}%`} />
                </div>

                <div className="flex flex-col gap-2.5 rounded-xl bg-[var(--wash,rgba(26,22,20,.03))] p-4">
                  <h3 className="text-xs font-sans uppercase tracking-wide text-[var(--muted)]">
                    {t.reportByStatus}
                  </h3>
                  {(() => {
                    const max = Math.max(1, ...ORDER.map((s) => report.status_breakdown[s] ?? 0));
                    return ORDER.map((s) => {
                      const count = report.status_breakdown[s] ?? 0;
                      return (
                        <div key={s} className="flex items-center gap-3 text-sm">
                          <span className="w-20 shrink-0 text-[var(--ink2)]">{STATUS_NAME[lang][s]}</span>
                          <div className="flex-1 h-2.5 rounded-full bg-black/[.06] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(count / max) * 100}%`, background: STATUS[s].dot }}
                            />
                          </div>
                          <span className="w-5 text-right font-medium tabular-nums">{count}</span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {error && <p className="text-xs text-[var(--color-brand)]">{error}</p>}

                <div className="flex flex-col gap-2 pt-2 border-t border-black/[.06]">
                  <button
                    onClick={downloadCsv}
                    className="rounded-lg border border-black/10 text-sm font-semibold py-2"
                  >
                    {t.reportDownload}
                  </button>
                  {!confirming ? (
                    <button
                      onClick={() => setConfirming(true)}
                      className="rounded-lg border border-[var(--color-brand)] text-[var(--color-brand)] text-sm font-semibold py-2"
                    >
                      {t.reportReset}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-700">{t.reportResetConfirm}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirming(false)}
                          className="flex-1 rounded-lg border border-black/10 text-sm py-1.5"
                        >
                          {t.cancel}
                        </button>
                        <button
                          disabled={pending}
                          onClick={handleReset}
                          className="flex-1 rounded-lg bg-[var(--color-brand)] text-white text-sm font-semibold py-1.5 disabled:opacity-60"
                        >
                          {t.reportResetYes}
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-[var(--muted)] text-center">{t.reportFoot}</p>
                </div>
              </>
            )}
          </div>
        </div>,
          document.body
        )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
    </div>
  );
}
