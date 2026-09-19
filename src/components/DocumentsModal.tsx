import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, FolderOpen, Upload, Loader2, Trash2, Download, CheckCircle2, Circle, AlertCircle, FileText } from 'lucide-react';
import type { ApplicantProfile, DocumentChecklistItem, DocumentKind, UploadedDocument } from '../types';
import { documentsApi, ApiError } from '../lib/api';
import { useI18n } from '../i18n/I18nContext';
import { useToast } from '../context/ToastContext';

interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  profile: ApplicantProfile;
  /** `page` renders inline as a cabinet section (no overlay, no close button). */
  variant?: 'modal' | 'page';
  /** Required-documents progress after every load — the cabinet shows it everywhere. */
  onProgressChange?: (progress: { required: number; uploadedRequired: number; percent: number } | null) => void;
  /** Uploaded files after every load — the analysis checks them against each university's list. */
  onFilesChange?: (files: UploadedDocument[]) => void;
}

const formatBytes = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export const DocumentsModal: React.FC<DocumentsModalProps> = ({ isOpen, onClose, isAuthenticated, onOpenAuth, profile, variant = 'modal', onProgressChange, onFilesChange }) => {
  const isPage = variant === 'page';
  const { t } = useI18n();
  const { notify } = useToast();
  const [items, setItems] = useState<DocumentChecklistItem[]>([]);
  const [progress, setProgress] = useState<{ required: number; uploadedRequired: number; percent: number } | null>(null);
  const [files, setFiles] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingKind, setUploadingKind] = useState<DocumentKind | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const describeError = useCallback(
    (err: unknown) => (err instanceof ApiError ? (err.code === 'NETWORK' ? t('common.backendOffline') : err.message) : t('common.error')),
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cl = await documentsApi.checklist(profile.targetRegions);
      setItems(cl.items);
      setProgress(cl.progress);
      onProgressChange?.(cl.progress);
      if (isAuthenticated) {
        const f = await documentsApi.list();
        setFiles(f.items);
        onFilesChange?.(f.items);
      } else {
        setFiles([]);
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.targetRegions, isAuthenticated, describeError]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  if (!isOpen) return null;

  const handleFile = async (kind: DocumentKind, file: File | undefined) => {
    if (!file) return;
    if (!isAuthenticated) {
      notify(t('common.loginRequired'), 'info');
      return;
    }
    setUploadingKind(kind);
    try {
      await documentsApi.upload(file, kind);
      notify(`${t('docs.uploaded')}: ${file.name}`, 'success');
      await load();
    } catch (err) {
      notify(describeError(err), 'error');
    } finally {
      setUploadingKind(null);
    }
  };

  const remove = async (doc: UploadedDocument) => {
    try {
      await documentsApi.remove(doc.id);
      await load();
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  return (
    <div
      className={isPage ? 'py-2 sm:py-4' : 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn'}
      role={isPage ? undefined : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-label={isPage ? undefined : t('docs.title')}
    >
      <div
        className={`w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] overflow-hidden flex flex-col ${
          isPage ? 'shadow-[var(--shadow-card)]' : 'max-w-3xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] shadow-[var(--shadow-overlay)] animate-popIn'
        }`}
      >
        {/* As a cabinet section the page header already says what this is. */}
        {!isPage && (
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="ar-icon-tile">
                <FolderOpen className="w-[18px] h-[18px]" />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">{t('docs.title')}</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{t('docs.subtitle')}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="ar-btn ar-btn-icon shrink-0" aria-label={t('common.close')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!isAuthenticated && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="flex items-start gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {t('common.loginRequired')}
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="ar-btn ar-btn-primary ar-btn-sm max-sm:min-h-10 shrink-0 self-start sm:self-auto"
              >
                {t('header.login')}
              </button>
            </div>
          )}

          {progress && (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{t('docs.progress')}</span>
                <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                  {progress.uploadedRequired}/{progress.required} · {progress.percent}%
                </span>
              </div>
              <div className="ar-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label={t('docs.progress')}>
                <span style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          )}

          {error && (
            <div className="ar-notice ar-notice-error" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="min-w-0">{error}</span>
            </div>
          )}
          {loading && (
            <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
            </div>
          )}

          <div className="space-y-2">
            {items.map((item) => {
              const busy = uploadingKind === item.kind;
              return (
                <div
                  key={item.kind}
                  className={`p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                    item.uploaded ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/25' : 'bg-[var(--surface-raised)] border-[var(--line)]'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.uploaded ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <Circle className="w-5 h-5 text-slate-300 dark:text-zinc-600" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</span>
                        <span className={item.required ? 'ar-badge ar-badge-blue' : 'ar-badge'}>{item.required ? t('docs.required') : t('docs.optional')}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">{item.description}</p>
                      {item.uploaded && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-zinc-300">
                          <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                            <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                            <span className="truncate sm:max-w-[220px]">{item.uploaded.originalName}</span>
                          </span>
                          <span className="text-slate-500 dark:text-zinc-400 tabular-nums">
                            {formatBytes(item.uploaded.sizeBytes)} · {item.uploaded.uploadedAt.slice(0, 10)}
                          </span>
                          <button type="button" onClick={() => documentsApi.download(item.uploaded!).catch((e) => notify(e.message, 'error'))} className="ar-link min-h-8 text-xs">
                            <Download className="w-3.5 h-3.5" /> {t('docs.download')}
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(item.uploaded!)}
                            className="inline-flex items-center gap-1 min-h-8 rounded-md font-semibold text-rose-600 hover:text-rose-700 hover:underline underline-offset-[3px] dark:text-rose-400 dark:hover:text-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      <input
                        ref={(el) => {
                          inputRefs.current[item.kind] = el;
                        }}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt"
                        onChange={(e) => {
                          handleFile(item.kind, e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => inputRefs.current[item.kind]?.click()}
                        disabled={busy}
                        aria-busy={busy}
                        className={`ar-btn ar-btn-sm max-sm:min-h-10 ${item.uploaded ? 'ar-btn-secondary' : 'ar-btn-primary'}`}
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {busy ? t('docs.uploading') : item.uploaded ? t('docs.replace') : t('docs.upload')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400">{t('docs.formats')}</p>

          {files.length > 0 && (
            <div className="pt-4 border-t border-[var(--line)]">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                {t('docs.myFiles')} <span className="text-slate-500 dark:text-zinc-400 font-medium tabular-nums">({files.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {files.map((f) => (
                  <div key={f.id} className="py-2 pl-3 pr-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-zinc-100 truncate">{f.originalName}</div>
                      <div className="text-slate-500 dark:text-zinc-400 truncate">
                        {f.kind} · {formatBytes(f.sizeBytes)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => documentsApi.download(f).catch((e) => notify(e.message, 'error'))}
                      className="ar-btn ar-btn-icon shrink-0"
                      title={t('docs.download')}
                      aria-label={t('docs.download')}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
