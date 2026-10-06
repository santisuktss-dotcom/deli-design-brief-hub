import { createClient } from '@/lib/supabase/client';

export async function uploadImage(briefId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() || 'png';
  const path = `${briefId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('brief-uploads').upload(path, file);
  if (error) throw error;
  return supabase.storage.from('brief-uploads').getPublicUrl(path).data.publicUrl;
}

export const MAX_IMAGES = 10;

// Uploads several images in parallel; resolves to their public URLs in the same order.
export async function uploadImages(briefId: string, files: File[]): Promise<string[]> {
  return Promise.all(files.map((f) => uploadImage(briefId, f)));
}
