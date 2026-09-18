'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/notification-actions';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import type { Lang } from '@/lib/lang';

export type NotificationRow = {
  id: string;
  brief_id: string | null;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
};

export default function NotificationBell({
  notifications,
  lang = 'en',
}: {
  notifications: NotificationRow[];
  lang?: Lang;
}) {
  const t = lang === 'th' ? th : en;
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next && unreadCount > 0) startTransition(() => markAllNotificationsRead());
            return next;
          });
        }}
        className="relative w-9 h-9 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/[.04] transition"
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-brand)] text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl border border-black/[.08] shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b border-black/[.06]">
            <span className="font-semibold text-sm">{t.notifTitle}</span>
            {unreadCount > 0 && (
              <button
                onClick={() => startTransition(() => markAllNotificationsRead())}
                className="text-xs text-[var(--color-brand)] hover:underline"
              >
                {t.markAllRead}
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-[var(--muted)]">{t.noNotif}</div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id} className={`border-b border-black/[.04] last:border-0 ${n.read ? '' : 'bg-black/[.02]'}`}>
                  <Link
                    href={n.brief_id ? `/projects/${n.brief_id}` : '#'}
                    onClick={() => {
                      setOpen(false);
                      if (!n.read) startTransition(() => markNotificationRead(n.id));
                    }}
                    className="block p-3 hover:bg-black/[.03] transition"
                  >
                    <div className="text-sm">{n.message}</div>
                    <div className="text-[11px] text-[var(--muted)] mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
