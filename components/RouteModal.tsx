'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Backing component for the calendar's "preview a project without leaving the calendar"
// modal (app/(app)/@modal/(.)projects/[id]/page.tsx). router.back() closes it the same way
// browser back would — this is an intercepted route, so back() lands on /calendar instead
// of unmounting to a blank state.
export default function RouteModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') router.back();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/40 overflow-y-auto"
      onClick={() => router.back()}
    >
      <div
        className="bg-[var(--background)] rounded-2xl max-w-2xl w-full my-8 sm:my-0 max-h-[85vh] overflow-y-auto p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button
            onClick={() => router.back()}
            className="text-[var(--muted)] hover:text-[var(--ink)] text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
