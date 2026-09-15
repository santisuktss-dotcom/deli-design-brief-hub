'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { signInWithGoogle } from '@/lib/auth-actions';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import { DEPT_STATUS_META } from '@/lib/workflow';
import type { DeptStatus } from '@/lib/department-actions';

const ERROR_MSG: Record<string, { th: string; en: string }> = {
  not_manager: { th: 'อีเมลนี้ไม่ใช่บัญชี Creative & Design Manager ที่กำหนดไว้', en: 'This Google account is not the configured Creative & Design Manager address.' },
  not_gmail: { th: 'กรุณาเข้าสู่ระบบด้วยบัญชี Gmail', en: 'Please sign in with a Gmail account.' },
  auth_failed: { th: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่', en: 'Sign-in failed. Please try again.' },
  missing_code: { th: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่', en: 'Sign-in failed. Please try again.' },
  unknown_role: { th: 'เกิดข้อผิดพลาด กรุณาลองใหม่', en: 'Something went wrong. Please try again.' },
  not_invited: { th: 'อีเมลนี้ยังไม่ได้รับเชิญ ติดต่อ Creative & Design Manager', en: 'This email has not been invited yet. Contact the Creative & Design Manager.' },
};

export default function LoginClient({
  error,
  jobsCount,
  assetsCount,
  designerCount,
  managerCount,
  deptStatus,
}: {
  error: string | null;
  jobsCount: number;
  assetsCount: number;
  designerCount: number;
  managerCount: number;
  deptStatus: DeptStatus;
}) {
  const [lang, setLang] = useState<'th' | 'en'>('en');
  const [dark, setDark] = useState(false);
  const t = lang === 'th' ? th : en;
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Correct the client's local time immediately on mount instead of showing the
    // server-rendered (UTC) time until the first 30s interval tick — otherwise anyone
    // outside UTC sees a stale clock for up to 30 seconds after the page loads.
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const rightBg = dark ? 'bg-[#171412]' : 'bg-[var(--background)]';
  const rightHeading = dark ? 'text-white' : 'text-[var(--ink)]';
  const cardBase = dark ? 'bg-[#221e1b] border-white/10' : 'bg-white border-black/10';
  const cardText = dark ? 'text-white/70' : 'text-[var(--muted)]';

  return (
    <div className="min-h-screen flex flex-wrap">
      {/* Left: brand panel */}
      <div className="flex-1 basis-full sm:basis-[60%] min-w-[320px] bg-[var(--color-brand)] text-white flex flex-col p-6 sm:p-10 gap-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-[52px] h-[52px] rounded-2xl bg-white p-[9px] flex items-center justify-center shrink-0">
              <Image src="/brand/deli-logo-red.png" alt="deli" width={34} height={34} />
            </div>
            <div className="font-sans text-[11px] tracking-[0.18em] uppercase leading-tight opacity-90">
              Design Brief Hub<br />Design department
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang('th')}
              className={`rounded-full border px-3 py-1.5 text-xs font-sans tracking-wide transition ${lang === 'th' ? 'bg-white text-[var(--color-brand)] border-white' : 'bg-white/15 border-white/30 hover:bg-white/25'}`}
            >
              ไทย
            </button>
            <button
              onClick={() => setLang('en')}
              className={`rounded-full border px-3 py-1.5 text-xs font-sans tracking-wide transition ${lang === 'en' ? 'bg-white text-[var(--color-brand)] border-white' : 'bg-white/15 border-white/30 hover:bg-white/25'}`}
            >
              EN
            </button>
            <button
              onClick={() => setDark((v) => !v)}
              className="rounded-full bg-white/15 border border-white/30 px-3 py-1.5 text-xs font-sans tracking-wide hover:bg-white/25 transition"
            >
              {dark ? '☀ ' + (lang === 'th' ? 'สว่าง' : 'Light') : '☾ ' + (lang === 'th' ? 'มืด' : 'Dark')}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-5 w-full max-w-[520px] mx-auto">
          <div className="rounded-[26px] bg-white/[.14] backdrop-blur-md border border-white/30 p-6 flex flex-col gap-1 overflow-hidden relative min-h-[210px]">
            <div className="text-xs font-sans tracking-[0.14em] uppercase opacity-80">{t.deptTitle}</div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-2xl sm:text-[28px] leading-snug mt-2 opacity-95 font-bold">
                {DEPT_STATUS_META[deptStatus][lang]}
              </div>
              <Image
                src={DEPT_STATUS_META[deptStatus].gif}
                alt=""
                width={140}
                height={140}
                unoptimized
                className="scale-[1.5] shrink-0 -translate-x-4"
              />
            </div>
          </div>

          <div className="rounded-[26px] bg-white/[.14] backdrop-blur-md border border-white/30 p-6 text-center">
            <div className="text-lg opacity-80" suppressHydrationWarning>
              {now
                ? now.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })
                : ' '}
            </div>
            <div className="font-display text-[56px] font-bold tabular-nums" suppressHydrationWarning>
              {now ? now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ' '}
            </div>
          </div>

          <div className="flex justify-center gap-6 pt-2">
            <Stat value={jobsCount} label={`${t.projUnit} / ${assetsCount} ${t.assets}`} />
            <Divider />
            <Stat value={managerCount} label={t.managersLabel} />
            <Divider />
            <Stat value={designerCount} label={t.designers} />
            <Divider />
            <Stat value={6} label={t.steps} />
          </div>
        </div>
      </div>

      {/* Right: access selection */}
      <div className={`flex-1 basis-full sm:basis-[40%] min-w-[320px] ${rightBg} flex items-center justify-center p-6 sm:p-10 transition-colors`}>
        <div className="w-full max-w-[440px] flex flex-col gap-6">
          <div>
            <div className="font-sans text-xs tracking-[0.18em] uppercase text-[var(--color-brand)]">{t.selectAccess}</div>
            <h1 className={`text-2xl sm:text-3xl font-bold mt-1 ${rightHeading}`}>{t.whoAmI}</h1>
          </div>

          {error && ERROR_MSG[error] && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
              {ERROR_MSG[error][lang]}
            </div>
          )}

          {/* Others Department */}
          <div className={`rounded-[20px] border p-5 flex flex-col gap-3 ${cardBase}`}>
            <div className="flex items-start justify-between gap-3">
              <div className={`font-semibold ${rightHeading}`}>{t.othersName}</div>
              <span className="shrink-0 whitespace-nowrap text-[10px] font-sans uppercase tracking-wide bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">{t.recommended}</span>
            </div>
            <p className={`text-sm ${cardText}`}>{t.othersDesc}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Chip ok label={t.permBrief} />
              <Chip ok label={t.permView} />
              <Chip label={t.permNoAssign} />
            </div>
            <form action={() => signInWithGoogle('requester')}>
              <GoogleButton dark label={t.othersBtn} />
            </form>
          </div>

          {/* Creative & Design Manager (solid red) + Designer sub-section */}
          <div className="rounded-[20px] bg-[var(--color-brand)] text-white p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold">{t.ownerName}</div>
              <span className="shrink-0 whitespace-nowrap text-[10px] font-sans uppercase tracking-wide bg-white/20 rounded-full px-2 py-0.5">FULL ACCESS</span>
            </div>
            <p className="text-sm opacity-90">{t.ownerDesc}</p>
            <form action={() => signInWithGoogle('manager')}>
              <GoogleButton label={t.ownerBtn} />
            </form>

            <div className="border-t border-white/20 pt-4 flex flex-col gap-2">
              <div className="font-semibold text-sm">{t.designerDesc}</div>
              <p className="text-xs opacity-80">{t.designerNote}</p>
              <form action={() => signInWithGoogle('designer')} className="mt-1">
                <GoogleButton label={t.designerBtn} />
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-4xl sm:text-5xl font-bold tabular-nums">{value}</div>
      <div className="text-xs opacity-80 mt-1">{label}</div>
    </div>
  );
}

function Divider() {
  return <div className="w-px bg-white/25" />;
}

function Chip({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 border ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-[var(--color-brand)]'}`}>
      {ok ? '✓' : '✕'} {label}
    </span>
  );
}

function GoogleButton({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <button
      type="submit"
      className={`relative w-full flex items-center justify-center rounded-lg py-2.5 pl-10 pr-4 text-sm font-semibold text-center transition ${
        dark
          ? 'bg-[var(--color-ink)] text-white hover:opacity-90'
          : 'bg-white text-[var(--color-brand)] hover:bg-white/90'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 shrink-0">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.1z"/>
        <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.6c-2 1.4-4.6 2.3-7.6 2.3-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.9 39.6 16.4 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.6 5.6C41.9 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"/>
      </svg>
      <span>{label}</span>
    </button>
  );
}
