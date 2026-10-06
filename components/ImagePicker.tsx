'use client';

import { useRef } from 'react';
import { MAX_IMAGES } from '@/lib/upload-image';
import type { th } from '@/lib/i18n/th';

// Several images at once: pick (or pick again) to add more, remove any one before sending.
export default function ImagePicker({
  files,
  onChange,
  label,
  t,
}: {
  files: File[];
  onChange: (f: File[]) => void;
  label: string;
  t: typeof th;
}) {
  const input = useRef<HTMLInputElement>(null);
  const full = files.length >= MAX_IMAGES;

  function add(list: FileList | null) {
    if (!list) return;
    onChange([...files, ...Array.from(list)].slice(0, MAX_IMAGES));
    // Clear the native input so picking the same file again still fires onChange.
    if (input.current) input.current.value = '';
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      {files.map((file, i) => (
        <div key={`${file.name}-${i}`} className="flex items-center gap-2 text-sm border border-black/[.12] rounded-[10px] px-3 py-2">
          <span className="flex-1 truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            className="text-xs text-[var(--color-brand)]"
          >
            {t.removeImg}
          </button>
        </div>
      ))}
      {!full && (
        <input ref={input} type="file" accept="image/*" multiple onChange={(e) => add(e.target.files)} className="text-sm" />
      )}
      <span className="text-[11px] text-[var(--muted2,var(--muted))]">
        {files.length}/{MAX_IMAGES} · {t.addMoreImgNote}
      </span>
    </div>
  );
}
