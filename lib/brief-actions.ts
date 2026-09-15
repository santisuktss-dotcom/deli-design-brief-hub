'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CategoryName } from '@/lib/workflow';

type ActionResult = { ok: true } | { error: string };

export async function createBrief(input: {
  title: string;
  category: CategoryName;
  briefText: string;
  deliverable: string;
  channel: string;
  round: number | null;
  assets: number;
  dueDate: string | null;
  requesterName?: string;
  requesterEmail?: string;
  referenceLink?: string | null;
  referenceImageUrl?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_brief', {
    p_title: input.title,
    p_category: input.category,
    p_brief_text: input.briefText,
    p_deliverable: input.deliverable,
    p_channel: input.channel,
    p_round: input.round,
    p_assets: input.assets,
    p_due_date: input.dueDate || null,
    p_requester_name: input.requesterName ?? null,
    p_requester_email: input.requesterEmail ?? null,
    p_reference_link: input.referenceLink || null,
    p_reference_image_url: input.referenceImageUrl || null,
  });
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/works');
  return { ok: true };
}

export async function acceptBrief(briefId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('accept_brief', { p_brief_id: briefId });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  return { ok: true };
}

export async function assignDesigner(briefId: string, designerId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('assign_designer', { p_brief_id: briefId, p_designer_id: designerId });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  return { ok: true };
}

export async function submitWork(briefId: string, link: string, imageUrl: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_work', { p_brief_id: briefId, p_link: link || null, p_image_url: imageUrl });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  return { ok: true };
}

export async function approveBrief(briefId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('approve_brief', { p_brief_id: briefId });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  return { ok: true };
}

export async function requestRevision(briefId: string, note: string, imageUrl: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('request_revision', { p_brief_id: briefId, p_note: note, p_image_url: imageUrl });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  return { ok: true };
}

export async function cancelBrief(briefId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_brief', { p_brief_id: briefId });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  return { ok: true };
}

export async function holdBrief(briefId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('hold_brief', { p_brief_id: briefId });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  return { ok: true };
}

export async function rescheduleBrief(briefId: string, dueDate: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('reschedule_brief', { p_brief_id: briefId, p_due_date: dueDate });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  revalidatePath('/calendar');
  return { ok: true };
}

export async function addComment(briefId: string, text: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  const { data: profile } = await supabase.from('profiles').select('name, nickname').eq('id', user.id).single();
  const authorName = profile?.nickname || profile?.name || 'User';
  const { error } = await supabase.from('brief_comments').insert({
    brief_id: briefId,
    author_id: user.id,
    author_name: authorName,
    text,
  });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  return { ok: true };
}
