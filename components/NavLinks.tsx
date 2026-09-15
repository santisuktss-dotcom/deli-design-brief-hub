'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import type { Lang } from '@/lib/lang';

export default function NavLinks({ lang }: { lang: Lang }) {
  const t = lang === 'th' ? th : en;
  const LINKS = [
    { href: '/', label: t.overview },
    { href: '/works', label: t.works },
    { href: '/calendar', label: t.calendar },
  ];
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((l) => {
        const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-full transition ${
              active
                ? 'text-[var(--color-brand)] bg-[var(--color-brand)]/10 font-semibold'
                : 'hover:bg-black/[.04]'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
