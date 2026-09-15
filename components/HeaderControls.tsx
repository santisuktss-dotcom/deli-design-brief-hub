'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLang, type Lang } from '@/lib/lang';

export default function HeaderControls({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const isDark = stored === 'dark';
    setDark(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  function changeLang(next: Lang) {
    if (next === lang) return;
    startTransition(async () => {
      await setLang(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => changeLang('th')}
        disabled={pending}
        className={`rounded-full border px-2.5 py-1 text-xs font-sans tracking-wide transition ${
          lang === 'th'
            ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
            : 'border-black/10 hover:bg-black/[.04]'
        }`}
      >
        ไทย
      </button>
      <button
        onClick={() => changeLang('en')}
        disabled={pending}
        className={`rounded-full border px-2.5 py-1 text-xs font-sans tracking-wide transition ${
          lang === 'en'
            ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
            : 'border-black/10 hover:bg-black/[.04]'
        }`}
      >
        EN
      </button>
      <button
        onClick={toggleTheme}
        className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-sans tracking-wide hover:bg-black/[.04] transition"
      >
        {dark ? '☀' : '☾'}
      </button>
    </div>
  );
}
