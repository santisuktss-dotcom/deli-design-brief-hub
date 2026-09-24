'use client';

import { useState, useTransition } from 'react';
import { updateBriefFile, deleteBriefFile, updateCommentImage } from '@/lib/brief-actions';
import { uploadImage } from '@/lib/upload-image';
import type { Dict } from '@/lib/i18n/th';

type ActionResult = { ok: true } | { error: string };

// One link or image on Project Detail (a brief_files row, or a comment's image). Whoever
// posted it — or the manager — gets Edit/Delete so a wrong link/image can be fixed.
// `onSave`/`onDelete` hide the difference between the two storage places.
function Attachment({
  briefId,
  url,
  name,
  isImage,
  canEdit,
  onSave,
  onDelete,
  t,
}: {
  briefId: string;
  url: string;
  name: string;
  isImage: boolean;
  canEdit: boolean;
  onSave: (url: string) => Promise<ActionResult>;
  onDelete: () => Promise<ActionResult>;
  t: Dict;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirmDelete'>('view');
  const [linkValue, setLinkValue] = useState(url);
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = pending || uploading;

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if ('error' in result) setError(result.error);
      else setMode('view');
    });
  }

  async function handleSave() {
    if (!isImage) {
      if (!linkValue.trim()) return;
      run(() => onSave(linkValue.trim()));
      return;
    }
    if (!image) return;
    setError(null);
    setUploading(true);
    let newUrl: string;
    try {
      newUrl = await uploadImage(briefId, image);
    } catch {
      setUploading(false);
      setError(t.uploadFailed);
      return;
    }
    setUploading(false);
    run(() => onSave(newUrl));
  }

  const smallBtn = 'text-xs px-2.5 py-1 rounded-full border border-black/10 transition disabled:opacity-60';

  return (
    <div className="flex flex-col gap-2">
      {isImage ? (
        <a href={url} target="_blank" rel="noreferrer" className="self-start">
          <img src={url} alt={name} className="rounded-lg max-h-64 border border-black/[.08]" />
        </a>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-brand)] hover:underline break-all">
          {name}
        </a>
      )}

      {canEdit && mode === 'view' && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLinkValue(url);
              setImage(null);
              setMode('edit');
            }}
            className={`${smallBtn} hover:border-[var(--color-ink)]`}
          >
            {isImage ? t.replaceImageBtn : t.editBtn}
          </button>
          <button
            onClick={() => setMode('confirmDelete')}
            className={`${smallBtn} hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]`}
          >
            {t.deleteBtn}
          </button>
        </div>
      )}

      {canEdit && mode === 'edit' && (
        <div className="flex flex-col gap-2">
          {isImage ? (
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="text-sm" />
          ) : (
            <input
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              className="border border-black/[.12] rounded-[10px] px-3 py-2 text-sm w-full outline-none focus:border-[var(--color-brand)]"
            />
          )}
          <div className="flex gap-2">
            <button
              disabled={busy || (isImage ? !image : !linkValue.trim())}
              onClick={handleSave}
              className={`${smallBtn} bg-[var(--color-brand)] border-transparent text-white font-semibold`}
            >
              {busy ? '…' : t.saveBtn}
            </button>
            <button disabled={busy} onClick={() => setMode('view')} className={smallBtn}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {canEdit && mode === 'confirmDelete' && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--muted)]">{t.confirmDeleteFile}</span>
          <button
            disabled={busy}
            onClick={() => run(onDelete)}
            className={`${smallBtn} bg-[var(--color-brand)] border-transparent text-white font-semibold`}
          >
            {busy ? '…' : t.deleteBtn}
          </button>
          <button disabled={busy} onClick={() => setMode('view')} className={smallBtn}>
            {t.cancel}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-[var(--color-brand)]">{error}</p>}
    </div>
  );
}

export function BriefFileItem({
  briefId,
  file,
  canEdit,
  t,
}: {
  briefId: string;
  file: { id: string; name: string; url: string; ext: string | null };
  canEdit: boolean;
  t: Dict;
}) {
  return (
    <Attachment
      briefId={briefId}
      url={file.url}
      name={file.name}
      isImage={file.ext === 'IMG'}
      canEdit={canEdit}
      onSave={(url) => updateBriefFile(briefId, file.id, url)}
      onDelete={() => deleteBriefFile(briefId, file.id)}
      t={t}
    />
  );
}

export function CommentImageItem({
  briefId,
  commentId,
  imageUrl,
  canEdit,
  t,
}: {
  briefId: string;
  commentId: string;
  imageUrl: string;
  canEdit: boolean;
  t: Dict;
}) {
  return (
    <Attachment
      briefId={briefId}
      url={imageUrl}
      name=""
      isImage
      canEdit={canEdit}
      onSave={(url) => updateCommentImage(briefId, commentId, url)}
      onDelete={() => updateCommentImage(briefId, commentId, null)}
      t={t}
    />
  );
}
