import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

// Handles all three real login-restriction paths from README "Roles & Access":
// - role=manager must match the one configured MANAGER_EMAIL
// - role=requester must be a @gmail.com address (the documented Others-Department rule)
// - role=designer must be on the designer_allowlist table (manager-managed invite list)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const role = searchParams.get('role');
  const next = '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const user = data.user;
  const email = (user.email ?? '').toLowerCase();
  const managerEmail = (process.env.MANAGER_EMAIL ?? '').toLowerCase();

  if (role === 'manager') {
    if (!managerEmail || email !== managerEmail) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=not_manager`);
    }
    await supabase.from('profiles').upsert({
      id: user.id,
      email,
      role: 'manager',
      name: 'Creative & Design Manager',
      name_en: 'Creative & Design Manager',
      initials: 'DM',
      capacity_pct: 20,
      capacity_cap: 4,
    }, { onConflict: 'id', ignoreDuplicates: true });
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (role === 'requester') {
    if (!email.endsWith('@gmail.com')) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=not_gmail`);
    }
    const displayName = (user.user_metadata?.full_name as string) || email.split('@')[0];
    await supabase.from('profiles').upsert({
      id: user.id,
      email,
      role: 'requester',
      name: displayName,
      initials: displayName.slice(0, 2).toUpperCase(),
    }, { onConflict: 'id', ignoreDuplicates: true });
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (role === 'designer') {
    const { data: allowed } = await supabase.rpc('check_designer_allowlist', { p_email: email });
    if (!allowed) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=not_invited`);
    }
    const { data: entryRows } = await supabase.rpc('designer_allowlist_entry', { p_email: email });
    const entry = entryRows?.[0];
    const displayName = (user.user_metadata?.full_name as string) || email.split('@')[0];
    await supabase.from('profiles').upsert({
      id: user.id,
      email,
      role: 'designer',
      name: entry?.name ?? displayName,
      name_en: entry?.name_en ?? entry?.name ?? displayName,
      initials: entry?.initials ?? displayName.slice(0, 2).toUpperCase(),
      capacity_pct: 40,
      capacity_cap: 8,
    }, { onConflict: 'id', ignoreDuplicates: true });
    return NextResponse.redirect(`${origin}${next}`);
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login?error=unknown_role`);
}
