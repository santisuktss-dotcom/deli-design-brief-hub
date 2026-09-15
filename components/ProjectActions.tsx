'use client';

import { useState, useTransition } from 'react';
import {
  acceptBrief,
  assignDesigner,
  submitWork,
  approveBrief,
  requestRevision,
  cancelBrief,
  holdBrief,
  addComment,
  rescheduleBrief,
} from '@/lib/brief-actions';
import type { Brief, DecoratedBrief } from '@/lib/workflow';
import type { CurrentUser } from '@/lib/current-user';
import DatePicker from './DatePicker';
import { th } from '@/lib/i18n/th';
import { en } from '@/lib/i18n/en';
import type { Lang } from '@/lib/lang';
import { createClient } from '@/lib/supabase/client';

async function uploadImage(briefId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() || 'png';
  const path = `${briefId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('brief-uploads').upload(path, file);
  if (error) throw error;
  return supabase.storage.from('brief-uploads').getPublicUrl(path).data.publicUrl;
}

type DesignerOption = { id: string; name: string; nickname: string | null; initials: string };

export default function ProjectActions({
  brief,
  deco,
  viewer,
  allDesigners,
  currentDesignerIds,
  hasSubmission,
  holidays,
  lang = 'en',
}: {
  brief: Brief;
  deco: DecoratedBrief;
  viewer: CurrentUser;
  allDesigners: DesignerOption[];
  currentDesignerIds: string[];
  hasSubmission: boolean;
  holidays: string[];
  lang?: Lang;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState(brief.due_date ?? '');
  const [commentText, setCommentText] = useState('');
  const t = lang === 'th' ? th : en;

  const isAssignedDesigner = viewer.role === 'designer' && currentDesignerIds.includes(viewer.id);
  const canApproveOrRevise = hasSubmission && (viewer.role === 'manager' || deco.isMine);
  const canSubmitWork = viewer.role === 'manager' || isAssignedDesigner;

  function run(action: () => Promise<{ ok: true } | { error: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if ('error' in result) setError(result.error);
      else onOk?.();
    });
  }

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-3">
        <h2 className="font-semibold">{t.detailsLabel}</h2>
        <MetaRow label={t.category} value={brief.category} />
        <MetaRow label={t.statusLabel} value={deco.statusLabel} />

        {viewer.role === 'manager' && !['Completed', 'Cancelled'].includes(brief.status) ? (
          <div className="flex flex-col gap-2 py-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">{t.fDue}</span>
              <div className="flex items-center gap-2">
                <span className={brief.due_date ? 'font-medium' : 'text-[var(--muted)]'}>
                  {brief.due_date ?? t.notSetYet}
                </span>
                <button
                  onClick={() => {
                    setNewDueDate(brief.due_date ?? '');
                    setRescheduleOpen((v) => !v);
                  }}
                  className="text-xs px-2.5 py-1 rounded-full border border-black/10 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition"
                >
                  {rescheduleOpen ? t.cancel : brief.due_date ? t.rescheduleBtn : t.setDeadlineBtn}
                </button>
              </div>
            </div>
            {rescheduleOpen && (
              <div className="flex flex-col gap-2">
                <DatePicker
                  name="rescheduleDueDate"
                  defaultValue={brief.due_date ?? undefined}
                  holidays={holidays}
                  onChange={setNewDueDate}
                  lang={lang}
                  key={brief.due_date}
                />
                <button
                  disabled={pending || !newDueDate}
                  onClick={() =>
                    run(() => rescheduleBrief(brief.id, newDueDate), () => setRescheduleOpen(false))
                  }
                  className="self-end rounded-lg bg-[var(--color-brand)] text-white text-xs font-semibold px-4 py-1.5 disabled:opacity-60"
                >
                  {t.saveDeadlineBtn}
                </button>
              </div>
            )}
          </div>
        ) : (
          <MetaRow label={t.fDue} value={brief.due_date ?? t.notSetYet} />
        )}

        <MetaRow label={t.fReq} value={brief.requester_name} />
        <MetaRow label={t.assignedToLabel} value={deco.designerLabel} />
      </div>

      {error && (
        <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-xl px-3 py-2">{error}</div>
      )}

      {/* Gate status for manager */}
      {deco.gated && (
        <div className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-3">
          <h2 className="font-semibold text-sm">{t.gateTitle}</h2>
          <GateRow done={brief.accepted} label={t.gate1} />
          <GateRow done={currentDesignerIds.length > 0} label={t.gate2} />
          {deco.canAccept && (
            <button
              disabled={pending}
              onClick={() => run(() => acceptBrief(brief.id))}
              className="rounded-lg bg-[var(--color-brand)] text-white text-sm font-semibold py-2 disabled:opacity-60"
            >
              {t.accept}
            </button>
          )}
        </div>
      )}

      {deco.canAssign && (
        <div className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-3">
          <h2 className="font-semibold text-sm">{t.assignLabel}</h2>
          <button onClick={() => setAssignOpen(true)} className="rounded-lg border border-black/10 text-sm font-semibold py-2">
            {currentDesignerIds.length ? t.changeAssignment : t.assignBtn}
          </button>
        </div>
      )}

      {deco.canCancelHold && (
        <div className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-2">
          <button
            disabled={pending}
            onClick={() => run(() => cancelBrief(brief.id))}
            className="rounded-lg border border-black/10 text-sm font-semibold py-2 disabled:opacity-60"
          >
            {t.requestCancel}
          </button>
          <button
            disabled={pending}
            onClick={() => run(() => holdBrief(brief.id))}
            className="rounded-lg border border-black/10 text-sm font-semibold py-2 disabled:opacity-60"
          >
            {t.requestHold}
          </button>
        </div>
      )}

      {canSubmitWork && !['Completed', 'Cancelled', 'OnHold'].includes(brief.status) && (
        <div className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-3">
          <h2 className="font-semibold text-sm">{t.submitWorkTitle}</h2>
          <button onClick={() => setSubmitOpen(true)} className="rounded-lg bg-[var(--color-ink)] text-white text-sm font-semibold py-2">
            {t.submitWorkBtn}
          </button>
        </div>
      )}

      {canApproveOrRevise && (
        <div className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-2">
          <button
            disabled={pending}
            onClick={() => run(() => approveBrief(brief.id))}
            className="rounded-lg bg-[var(--color-brand)] text-white text-sm font-semibold py-2 disabled:opacity-60"
          >
            {t.approve}
          </button>
          <button
            onClick={() => setRevisionOpen(true)}
            className="rounded-lg border border-black/10 text-sm font-semibold py-2"
          >
            {t.requestRev}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-black/[.08] bg-white p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-sm">{t.addCommentLabel}</h2>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={2}
          className="border border-black/[.12] rounded-[10px] px-3 py-2 text-sm resize-none"
          placeholder={t.commentPh}
        />
        <button
          disabled={pending || !commentText.trim()}
          onClick={() =>
            run(() => addComment(brief.id, commentText), () => setCommentText(''))
          }
          className="self-end rounded-lg border border-black/10 text-sm font-semibold px-4 py-1.5 disabled:opacity-60"
        >
          {t.postComment}
        </button>
      </div>

      {assignOpen && (
        <Modal onClose={() => setAssignOpen(false)} title={t.assignModalTitle}>
          <div className="flex flex-col gap-2">
            {allDesigners.map((d) => {
              const active = currentDesignerIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  disabled={pending}
                  onClick={() => run(() => assignDesigner(brief.id, d.id))}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    active ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5' : 'border-black/10'
                  }`}
                >
                  <span>{d.nickname || d.name}</span>
                  {active && <span className="text-[var(--color-brand)]">✓</span>}
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {submitOpen && (
        <SubmitWorkModal
          briefId={brief.id}
          onClose={() => setSubmitOpen(false)}
          onSubmit={(link, imageUrl) =>
            run(() => submitWork(brief.id, link, imageUrl), () => setSubmitOpen(false))
          }
          pending={pending}
          t={t}
        />
      )}

      {revisionOpen && (
        <RevisionModal
          briefId={brief.id}
          onClose={() => setRevisionOpen(false)}
          onSubmit={(note, imageUrl) =>
            run(() => requestRevision(brief.id, note, imageUrl), () => setRevisionOpen(false))
          }
          pending={pending}
          t={t}
        />
      )}
    </aside>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function GateRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${
          done ? 'bg-emerald-500' : 'bg-black/20'
        }`}
      >
        {done ? '✓' : ''}
      </span>
      <span className={done ? '' : 'text-[var(--muted)]'}>{label}</span>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-[var(--muted)]">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ImagePicker({
  file,
  onChange,
  label,
  t,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  label: string;
  t: typeof th;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      {file ? (
        <div className="flex items-center gap-2 text-sm border border-black/[.12] rounded-[10px] px-3 py-2">
          <span className="flex-1 truncate">{file.name}</span>
          <button type="button" onClick={() => onChange(null)} className="text-xs text-[var(--color-brand)]">
            {t.removeImg}
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      )}
    </div>
  );
}

function SubmitWorkModal({
  briefId,
  onClose,
  onSubmit,
  pending,
  t,
}: {
  briefId: string;
  onClose: () => void;
  onSubmit: (link: string, imageUrl: string | null) => void;
  pending: boolean;
  t: typeof th;
}) {
  const [link, setLink] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    let imageUrl: string | null = null;
    if (image) {
      setUploading(true);
      try {
        imageUrl = await uploadImage(briefId, image);
      } catch {
        setUploading(false);
        setError('Image upload failed — please try again.');
        return;
      }
      setUploading(false);
    }
    onSubmit(link, imageUrl);
  }

  return (
    <Modal title={t.submitWorkTitle} onClose={onClose}>
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder={t.submitWorkLinkPh}
        className="border border-black/[.12] rounded-[10px] px-3 py-2 text-sm"
      />
      <ImagePicker file={image} onChange={setImage} label={t.submitWorkImgLabel} t={t} />
      {error && <p className="text-xs text-[var(--color-brand)]">{error}</p>}
      <button
        disabled={pending || uploading}
        onClick={handleConfirm}
        className="rounded-lg bg-[var(--color-ink)] text-white text-sm font-semibold py-2 disabled:opacity-60"
      >
        {uploading ? '…' : t.submitWorkConfirm}
      </button>
    </Modal>
  );
}

function RevisionModal({
  briefId,
  onClose,
  onSubmit,
  pending,
  t,
}: {
  briefId: string;
  onClose: () => void;
  onSubmit: (note: string, imageUrl: string | null) => void;
  pending: boolean;
  t: typeof th;
}) {
  const [note, setNote] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    let imageUrl: string | null = null;
    if (image) {
      setUploading(true);
      try {
        imageUrl = await uploadImage(briefId, image);
      } catch {
        setUploading(false);
        setError('Image upload failed — please try again.');
        return;
      }
      setUploading(false);
    }
    onSubmit(note, imageUrl);
  }

  return (
    <Modal title={t.revisionTitle} onClose={onClose}>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={t.revisionPh}
        className="border border-black/[.12] rounded-[10px] px-3 py-2 text-sm resize-none"
      />
      <ImagePicker file={image} onChange={setImage} label={t.revisionImgLabel} t={t} />
      {error && <p className="text-xs text-[var(--color-brand)]">{error}</p>}
      <button
        disabled={pending || uploading}
        onClick={handleConfirm}
        className="rounded-lg bg-[var(--color-brand)] text-white text-sm font-semibold py-2 disabled:opacity-60"
      >
        {uploading ? '…' : t.revisionSubmit}
      </button>
    </Modal>
  );
}
