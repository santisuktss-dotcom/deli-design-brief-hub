'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { createBrief } from '@/lib/brief-actions';
import { CATS, type CategoryName } from '@/lib/workflow';
import type { CurrentUser } from '@/lib/current-user';
import DatePicker from './DatePicker';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import type { Lang } from '@/lib/lang';
import { createClient } from '@/lib/supabase/client';

async function uploadReferenceImage(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() || 'png';
  const path = `new-brief/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('brief-uploads').upload(path, file);
  if (error) throw error;
  return supabase.storage.from('brief-uploads').getPublicUrl(path).data.publicUrl;
}

function isBlockedDate(dateStr: string, holidays: string[]): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  if (day === 0 || day === 6) return true;
  return holidays.includes(dateStr);
}

const inputClass =
  'border border-black/[.12] rounded-[10px] px-3 py-2 text-sm w-full outline-none focus:border-[var(--color-brand)]';

// If the session drops mid-typing (expired token, network blip, a Netlify hiccup) the
// modal unmounts and everything typed is gone. Autosaving text fields to localStorage as
// the user types means reopening the form — even after being bounced to /login and back —
// restores what they had, instead of forcing a full retype of a long brief.
const DRAFT_KEY = 'deli:new-brief-draft';
const DRAFT_FIELDS = ['title', 'requesterName', 'briefText', 'referenceLink', 'deliverable', 'channel'] as const;
type Draft = Partial<Record<(typeof DRAFT_FIELDS)[number], string>>;

function readDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDraft(form: HTMLFormElement) {
  try {
    const fd = new FormData(form);
    const draft: Draft = {};
    for (const key of DRAFT_FIELDS) {
      const v = fd.get(key);
      if (v) draft[key] = String(v);
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage unavailable (private mode etc.) — draft saving is a nicety, not required
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export default function NewBriefButton({
  viewer,
  holidays,
  busyDates,
  label,
  lang = 'en',
}: {
  viewer: CurrentUser;
  holidays: string[];
  busyDates?: Record<string, string[]>;
  label?: string;
  lang?: Lang;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draft, setDraftState] = useState<Draft>({});
  const t = lang === 'th' ? th : en;

  const isManager = viewer.role === 'manager';

  function openModal() {
    setDraftState(readDraft());
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setError(null);
    setDateError(null);
    setRefImage(null);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    const dueDate = String(formData.get('dueDate') ?? '');
    if (isBlockedDate(dueDate, holidays)) {
      setDateError(t.errBlockedDate);
      return;
    }
    setDateError(null);

    const title = String(formData.get('title') ?? '').trim();
    const requesterName = String(formData.get('requesterName') ?? '').trim();
    if (!title || (isManager && !requesterName)) {
      setError(t.errName);
      return;
    }

    const referenceLink = String(formData.get('referenceLink') ?? '').trim();

    startTransition(async () => {
      let referenceImageUrl: string | null = null;
      if (refImage) {
        setUploading(true);
        try {
          referenceImageUrl = await uploadReferenceImage(refImage);
        } catch {
          setUploading(false);
          setError('Image upload failed — please try again.');
          return;
        }
        setUploading(false);
      }

      const result = await createBrief({
        title,
        category: String(formData.get('category')) as CategoryName,
        briefText: String(formData.get('briefText') ?? ''),
        deliverable: String(formData.get('deliverable') ?? ''),
        channel: String(formData.get('channel') ?? ''),
        round: formData.get('round') ? Number(formData.get('round')) : null,
        assets: formData.get('assets') ? Number(formData.get('assets')) : 1,
        dueDate,
        requesterName: isManager ? requesterName : undefined,
        requesterEmail: isManager ? String(formData.get('requesterEmail') ?? '').trim() || undefined : undefined,
        referenceLink: referenceLink || undefined,
        referenceImageUrl: referenceImageUrl || undefined,
      });
      if ('error' in result) {
        setError(result.error);
      } else {
        clearDraft();
        close();
      }
    });
  }

  return (
    <>
      <button
        onClick={openModal}
        className="sweep-shine rounded-full bg-[var(--color-brand)] text-white text-sm font-semibold px-4 py-2 hover:bg-[var(--color-brand-hover)] transition"
      >
        {label ?? t.newBrief}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={close}>
          <div
            className="bg-[var(--color-surface)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.formTitle}</h2>
              <button onClick={close} className="text-[var(--muted)] hover:text-[var(--ink)]">
                ✕
              </button>
            </div>

            <form
              action={handleSubmit}
              onInput={(e) => saveDraft(e.currentTarget)}
              className="flex flex-col gap-3"
            >
              <Field label={t.fName}>
                <input name="title" required defaultValue={draft.title} className={inputClass} />
              </Field>

              <Field label={t.fCat}>
                <select name="category" required className={inputClass} defaultValue={CATS[0].name}>
                  {CATS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              {isManager && (
                <Field label={t.fReq}>
                  <input name="requesterName" required defaultValue={draft.requesterName} className={inputClass} placeholder={t.reqNamePh} />
                </Field>
              )}

              <Field label={t.fBrief}>
                <textarea name="briefText" rows={3} defaultValue={draft.briefText} className={`${inputClass} resize-none`} />
              </Field>

              <Field label={t.fLink}>
                <input name="referenceLink" type="url" defaultValue={draft.referenceLink} placeholder={t.linkPh} className={inputClass} />
              </Field>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-[var(--muted)]">{t.revisionImgLabel}</span>
                {refImage ? (
                  <div className="flex items-center gap-2 text-sm border border-black/[.12] rounded-[10px] px-3 py-2">
                    <span className="flex-1 truncate">{refImage.name}</span>
                    <button
                      type="button"
                      onClick={() => setRefImage(null)}
                      className="text-xs text-[var(--color-brand)]"
                    >
                      {t.removeImg}
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setRefImage(e.target.files?.[0] ?? null)}
                    className="text-sm"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t.fDeliv}>
                  <input name="deliverable" defaultValue={draft.deliverable} placeholder={t.fDelivPh} className={inputClass} />
                </Field>
                <Field label={t.fChannel}>
                  <input name="channel" defaultValue={draft.channel} placeholder={t.fChannelPh} className={inputClass} />
                </Field>
                <Field label={t.fAssets}>
                  <input name="assets" type="number" min={1} defaultValue={1} className={inputClass} />
                </Field>
              </div>

              <DatePicker
                name="dueDate"
                label={isManager ? t.fDue : t.deadlineOptionalLabel}
                holidays={holidays}
                busyDates={busyDates}
                lang={lang}
              />
              {!isManager && <p className="text-xs text-[var(--muted)] -mt-2">{t.leaveBlankNote}</p>}
              {dateError && <p className="text-xs text-[var(--color-brand)]">{dateError}</p>}
              {error && <p className="text-xs text-[var(--color-brand)]">{error}</p>}

              <p className="text-xs text-[var(--muted)]">{t.formFoot}.</p>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={close} className="px-4 py-2 text-sm rounded-lg border border-black/10">
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={pending || uploading}
                  className="px-4 py-2 text-sm rounded-lg bg-[var(--color-brand)] text-white disabled:opacity-60"
                >
                  {pending || uploading ? t.sendingLabel : t.submit}
                </button>
              </div>
            </form>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
