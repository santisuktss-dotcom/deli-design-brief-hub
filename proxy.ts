import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16 renamed Middleware to Proxy — same runtime, this file replaces middleware.ts.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // /api routes handle their own auth (e.g. notify-email checks its own shared-secret
  // header for Supabase's webhook caller, which has no browser session at all) — running
  // them through the page-auth redirect here would 307 a webhook POST to an HTML /login
  // page instead of ever reaching the route handler.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
