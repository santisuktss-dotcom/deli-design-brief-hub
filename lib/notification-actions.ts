'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase.from('notifications').update({ read: true }).eq('id', id);
  revalidatePath('/', 'layout');
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('notifications').update({ read: true }).eq('recipient_id', user.id).eq('read', false);
  revalidatePath('/', 'layout');
}
