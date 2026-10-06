'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CategoryName } from '@/lib/workflow';

type ActionResult = { ok: true } | { error: string };

// The RPCs that already take a single image keep doing so (first image); any further images
// are appended as attachments in one call (add_brief_images, 0043). Returns an error result
// only if that follow-up fails, since the main action has already gone through by then.
async function addExtraImages(briefId: string | undefined, urls: string[] | undefined, name: string): Promise<ActionResult | null> {
  if (!briefId || !urls || urls.length === 0) return null;
  const supabase = await createClient();
  const { error } = await supabase.rpc('add_brief_images', { p_brief_id: briefId, p_urls: urls, p_name: name });
  return error ? { error: `Saved, but the extra images failed: ${error.message}` } : null;
}

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
  extraImageUrls?: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_brief', {
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
  const extra = await addExtraImages((data as { id: string } | null)?.id, input.extraImageUrls, 'Reference image');
  revalidatePath('/');
  revalidatePath('/works');
  return extra ?? { ok: true };
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

export async function unassignDesigner(briefId: string, designerId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('unassign_designer', { p_brief_id: briefId, p_designer_id: designerId });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  return { ok: true };
}

export async function submitWork(briefId: string, link: string, imageUrls: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const [first, ...rest] = imageUrls;
  const { error } = await supabase.rpc('submit_work', { p_brief_id: briefId, p_link: link || null, p_image_url: first ?? null });
  if (error) return { error: error.message };
  const extra = await addExtraImages(briefId, rest, 'Submitted image');
  revalidatePath(`/projects/${briefId}`);
  return extra ?? { ok: true };
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

export async function requestRevision(briefId: string, note: string, imageUrls: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const [first, ...rest] = imageUrls;
  const { error } = await supabase.rpc('request_revision', { p_brief_id: briefId, p_note: note, p_image_url: first ?? null });
  if (error) return { error: error.message };
  const extra = await addExtraImages(briefId, rest, 'Revision image');
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  return extra ?? { ok: true };
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

export async function deleteBrief(briefId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_brief', { p_brief_id: briefId });
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/works');
  revalidatePath('/calendar');
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

export async function rescheduleBriefStart(briefId: string, startDate: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('reschedule_brief_start', { p_brief_id: briefId, p_start_date: startDate });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/calendar');
  return { ok: true };
}

export async function updateBriefScope(
  briefId: string,
  dueDate: string | null,
  assets: number | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('update_brief_scope', {
    p_brief_id: briefId,
    p_due_date: dueDate,
    p_assets: assets,
  });
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

export async function updateBriefCategory(briefId: string, category: CategoryName): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('update_brief_category', { p_brief_id: briefId, p_category: category });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  revalidatePath('/calendar');
  return { ok: true };
}

export async function updateBriefFile(briefId: string, fileId: string, url: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('update_brief_file', { p_file_id: fileId, p_url: url });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  return { ok: true };
}

export async function deleteBriefFile(briefId: string, fileId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_brief_file', { p_file_id: fileId });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  return { ok: true };
}

// imageUrl null removes the image from the comment.
export async function updateCommentImage(briefId: string, commentId: string, imageUrl: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('update_comment_image', { p_comment_id: commentId, p_image_url: imageUrl });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  return { ok: true };
}

export async function updateBriefTitle(briefId: string, title: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('update_brief_title', { p_brief_id: briefId, p_title: title });
  if (error) return { error: error.message };
  revalidatePath(`/projects/${briefId}`);
  revalidatePath('/');
  revalidatePath('/works');
  revalidatePath('/calendar');
  return { ok: true };
}
