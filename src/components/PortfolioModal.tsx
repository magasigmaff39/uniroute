import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Briefcase,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  MessageSquareText,
  ScanSearch,
  Link2,
  FileText,
  ListPlus,
  AlertTriangle,
  Trophy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  EyeOff,
  Eye,
  Star,
  Quote,
  BadgeCheck,
  ArrowRight,
  ListChecks,
  Target,
} from 'lucide-react';
import type {
  ApplicantProfile,
  PortfolioEvaluation,
  PortfolioFieldId,
  PortfolioItem,
  PortfolioItemInput,
  PortfolioItemType,
  PortfolioLevel,
  PortfolioRecommendation,
  PortfolioResult,
  PortfolioScore,
  TaskCategory,
  UploadedDocument,
} from '../types';
import { portfolioApi, tasksApi, documentsApi, ApiError, type PortfolioMeta } from '../lib/api';
import { UNIVERSITY_DATABASE } from '../data/universities';
import { useI18n } from '../i18n/I18nContext';
import { useToast } from '../context/ToastContext';
import { Markdown } from './ui/Markdown';
import { UniversityCrest } from './ui/UniversityCrest';
import { useProgressCaptions } from '../hooks/useProgressCaptions';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  profile: ApplicantProfile;
  selectedForCompare: string[];
  /** Prefill the form (e.g. from the olympiad catalogue) */
  draft?: Partial<PortfolioItemInput> | null;
  onDraftConsumed?: () => void;
  /** `page` renders inline as a cabinet section (no overlay, no close button). */
  variant?: 'modal' | 'page';
  /** Entries changed — the cabinet merges them into every analysis. */
  onItemsChange?: (items: PortfolioItem[]) => void;
}

type Tab = 'items' | 'evaluate';

const emptyForm = (): PortfolioItemInput => ({
  title: '',
  type: 'olympiad',
  organization: '',
  level: null,
  result: null,
  role: '',
  description: '',
  startDate: null,
  endDate: null,
  hoursPerWeek: null,
  links: [],
  documentId: null,
});

const labelCls = 'ar-label';
const panelCls = 'rounded-xl border border-[var(--line)] bg-[var(--surface-raised)]';
const softPanelCls = 'rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)]';
/** Small uppercase label above a block of the evaluation. */
const microLabelCls = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-zinc-400';
/** Title of a block inside the portfolio panel. */
const blockTitleCls = 'text-base font-semibold text-slate-900 dark:text-white';

/** Colour scale for the 1–10 significance score. */
const scoreTone = (score: number) =>
  score >= 9
    ? { chip: 'bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-200', bar: 'bg-emerald-500' }
    : score >= 5
      ? { chip: 'bg-blue-600 text-white dark:bg-blue-500/20 dark:text-blue-200', bar: 'bg-blue-500' }
      : { chip: 'bg-amber-500 text-white dark:bg-amber-500/20 dark:text-amber-200', bar: 'bg-amber-500' };

/** Badge tone of an AI recommendation (highlight / keep / drop). */
const recTone = (rec: PortfolioRecommendation) => (rec === 'highlight' ? 'ar-badge-green' : rec === 'keep' ? 'ar-badge-blue' : 'ar-badge-amber');

const ScoreRing = ({ value, size = 88 }: { value: number; size?: number }) => {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0" role="img" aria-label={`${value}/100`}>
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="8" fill="none" className="ring-track" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stroke-blue-600 dark:stroke-blue-400"
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size / 4.2} fontWeight="700" className="fill-slate-900 dark:fill-white tabular-nums">
        {value}
      </text>
    </svg>
  );
};

const Bar = ({ value, computed }: { value: number; computed?: number }) => (
  <div className="relative h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
    <div className="absolute inset-y-0 left-0 rounded-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-500" style={{ width: `${Math.max(2, value)}%` }} />
    {computed !== undefined && <div className="absolute inset-y-0 w-0.5 bg-slate-900/60 dark:bg-white/70" style={{ left: `${computed}%` }} title={`${computed}`} />}
  </div>
);

/** 1–10 pill with ten dots. */
const ScoreChip: React.FC<{ score: number; label: string; muted?: boolean }> = ({ score, label, muted = false }) => {
  const tone = scoreTone(score);
  return (
    <div className={`flex items-center gap-2 ${muted ? 'opacity-70' : ''}`} title={label}>
      <span className={`inline-flex items-center justify-center min-w-11 px-2 py-1 rounded-lg text-sm font-semibold tabular-nums ${muted ? 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200' : tone.chip}`}>
        {score}
        <span className="text-[11px] font-medium opacity-80 ml-0.5">/10</span>
      </span>
      <span className="hidden sm:flex items-center gap-[3px]" aria-hidden>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < score ? (muted ? 'bg-slate-400 dark:bg-zinc-500' : tone.bar) : 'bg-slate-200 dark:bg-zinc-800'}`} />
        ))}
      </span>
    </div>
  );
};

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ isOpen, onClose, isAuthenticated, onOpenAuth, profile, selectedForCompare, draft, onDraftConsumed, variant = 'modal', onItemsChange }) => {
  const isPage = variant === 'page';
  const { t, tx, lang } = useI18n();
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>('items');
  const [meta, setMeta] = useState<PortfolioMeta | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [score, setScore] = useState<PortfolioScore | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PortfolioItemInput>(emptyForm());
  const [linkInput, setLinkInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [field, setField] = useState<PortfolioFieldId | ''>('');
  const [targetIds, setTargetIds] = useState<string[]>([]);
  // Default: the engine picks the universities from the applicant's preferences; a manual list is opt-in.
  const [manualTargets, setManualTargets] = useState(false);
  const [evaluation, setEvaluation] = useState<PortfolioEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const evalCaption = useProgressCaptions(evaluating, [t('progress.reading'), t('progress.rubric'), t('progress.universities'), t('progress.plan'), t('progress.finishing')]);

  const describeError = useCallback(
    (err: unknown) => (err instanceof ApiError ? (err.code === 'NETWORK' ? t('common.backendOffline') : err.message) : err instanceof Error ? err.message : t('common.error')),
    [t],
  );

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [m, list, docs] = await Promise.all([meta ? Promise.resolve(meta) : portfolioApi.meta(), portfolioApi.list(field || undefined), documentsApi.list().catch(() => ({ items: [] }))]);
      setMeta(m);
      setItems(list.items);
      setScore(list.score);
      setDocuments(docs.items);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, describeError, field, meta]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  useEffect(() => {
    if (isOpen && !targetIds.length) {
      const initial = Array.from(new Set([...(profile.targetUniversityIds || []), ...selectedForCompare])).slice(0, 6);
      setTargetIds(initial);
    }
  }, [isOpen, profile.targetUniversityIds, selectedForCompare, targetIds.length]);

  useEffect(() => {
    if (isOpen && draft) {
      setForm({ ...emptyForm(), ...draft, title: draft.title || '' });
      setEditingId(null);
      setFormOpen(true);
      setTab('items');
      onDraftConsumed?.();
    }
  }, [isOpen, draft, onDraftConsumed]);

  useEffect(() => {
    if (isOpen && !loading) onItemsChange?.(items);
    // Report only settled lists; the callback identity may change on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loading]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen || isPage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isPage, onClose]);

  const typeLabel = (id: string) => meta?.types.find((x) => x.id === id)?.label || id;
  const levelLabel = (id: string | null) => (id ? meta?.levels.find((x) => x.id === id)?.label || id : '');
  const resultLabel = (id: string | null) => (id && id !== 'none' ? meta?.results.find((x) => x.id === id)?.label || id : '');

  const activeItems = useMemo(() => items.filter((it) => !it.excluded), [items]);
  const ratedCount = useMemo(() => items.filter((it) => it.ai).length, [items]);

  const sortedForList = useMemo(() => {
    const val = (it: PortfolioItem) => it.ai?.score ?? it.preScore ?? 0;
    return [...items].sort((a, b) => Number(a.excluded) - Number(b.excluded) || val(b) - val(a));
  }, [items]);

  if (!isOpen) return null;

  const startEdit = (it: PortfolioItem) => {
    setEditingId(it.id);
    const { ai: _ai, preScore: _pre, ...rest } = it;
    void _ai;
    void _pre;
    setForm({ ...rest });
    setMoreOpen(Boolean(it.organization || it.role || it.startDate || it.endDate || it.hoursPerWeek || it.links.length || it.documentId));
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) return;
    setSaving(true);
    try {
      if (editingId) await portfolioApi.update(editingId, form);
      else await portfolioApi.create(form);
      setForm(emptyForm());
      setEditingId(null);
      setFormOpen(false);
      setMoreOpen(false);
      await load();
      notify(t('portfolio.saved'), 'success');
    } catch (err) {
      notify(describeError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (it: PortfolioItem) => {
    try {
      await portfolioApi.remove(it.id);
      await load();
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  const toggleExcluded = async (it: PortfolioItem) => {
    setTogglingId(it.id);
    try {
      const next = await portfolioApi.update(it.id, { excluded: !it.excluded });
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, ...next, preScore: x.preScore } : x)));
      // Score changes with the application set.
      const list = await portfolioApi.list(field || undefined);
      setItems(list.items);
      setScore(list.score);
    } catch (err) {
      notify(describeError(err), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const addLink = () => {
    const v = linkInput.trim();
    if (!/^https?:\/\//i.test(v)) return;
    setForm((f) => ({ ...f, links: [...(f.links || []), v].slice(0, 6) }));
    setLinkInput('');
  };

  const runEvaluation = async () => {
    setEvaluating(true);
    setEvalError(null);
    setTab('evaluate');
    try {
      const res = await portfolioApi.evaluate({ field: field || undefined, universityIds: manualTargets ? targetIds : [], profile, language: lang });
      setEvaluation(res);
      // Verdicts are persisted on the entries — refresh so the list shows them too.
      const list = await portfolioApi.list(field || undefined);
      setItems(list.items);
      setScore(list.score);
    } catch (err) {
      setEvalError(describeError(err));
    } finally {
      setEvaluating(false);
    }
  };

  const addPlanToTasks = async () => {
    if (!evaluation?.actionPlan?.length) return;
    try {
      const res = await tasksApi.bulkCreate(
        evaluation.actionPlan.map((a) => ({ title: a.title.slice(0, 200), description: a.why, category: (a.category || 'portfolio') as TaskCategory, dueDate: /^\d{4}-\d{2}/.test(a.deadline) ? a.deadline.slice(0, 10) : null, source: 'portfolio-eval' })),
      );
      notify(`${t('ai.analyze.addTasks')}: ${res.created.length}`, 'success');
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  const tierCls = (tier: string) => (tier === 'exceptional' ? 'ar-badge-green' : tier === 'strong' ? 'ar-badge-blue' : tier === 'developing' ? 'ar-badge-amber' : '');

  const evaluatedItems = evaluation ? [...evaluation.items].sort((a, b) => b.score - a.score) : [];

  const renderTabSwitch = (className = '') => (
    <div className={`grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-[var(--line)] ${className}`}>
      {(['items', 'evaluate'] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => setTab(k)}
          className={`min-h-9 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition inline-flex items-center justify-center gap-1.5 ${
            tab === k ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
          }`}
          aria-pressed={tab === k}
        >
          {k === 'evaluate' && <ScanSearch className="w-3.5 h-3.5" />}
          {t(`portfolio.tab.${k}`)}
          {k === 'items' && items.length > 0 && <span className="text-[11px] font-medium tabular-nums opacity-70">{items.length}</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={isPage ? 'py-2 sm:py-4' : 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn'}
      onMouseDown={(e) => {
        if (!isPage && e.target === e.currentTarget) onClose();
      }}
      role={isPage ? undefined : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-label={t('portfolio.title')}
    >
      <div
        className={`w-full rounded-2xl overflow-hidden flex flex-col bg-[var(--surface-raised)] border border-[var(--line)] ${
          isPage ? 'shadow-[var(--shadow-card)]' : 'max-w-5xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] shadow-[var(--shadow-overlay)] animate-popIn'
        }`}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="ar-icon-tile">
              <Briefcase className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0">
              <h3 className={`${isPage ? 'text-base' : 'text-lg'} font-semibold text-slate-900 dark:text-white leading-tight`}>{t('portfolio.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{t('portfolio.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {renderTabSwitch('hidden sm:grid')}
            {!isPage && (
              <button type="button" onClick={onClose} className="ar-btn ar-btn-icon" aria-label={t('common.close')}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="sm:hidden px-4 pt-3 shrink-0">{renderTabSwitch()}</div>

        {!isAuthenticated ? (
          <div className="px-6 py-10 text-center flex flex-col items-center gap-3">
            <p className="text-sm text-slate-600 dark:text-zinc-400">{t('common.loginRequired')}</p>
            <button type="button" onClick={onOpenAuth} className="ar-btn ar-btn-primary">
              {t('header.login')}
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm text-slate-700 dark:text-zinc-300">
            {error && (
              <div className="ar-notice ar-notice-error" role="alert">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0">{error}</span>
              </div>
            )}

            {/* ============================================================ ITEMS */}
            {tab === 'items' && (
              <>
                {/* Summary strip */}
                <div className={`${softPanelCls} p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:items-center`}>
                  {score && <ScoreRing value={score.total} />}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={blockTitleCls}>{t('portfolio.scoreTitle')}</h4>
                      {score?.tier && <span className={`ar-badge ${tierCls(score.tier)}`}>{t(`portfolio.tier.${score.tier}`)}</span>}
                      {score && <span className="text-xs text-slate-500 dark:text-zinc-400">{score.fieldTitle}</span>}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">{t('portfolio.itemsHint')}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
                      <span>
                        {t('portfolio.count')}: <strong className="font-semibold tabular-nums text-slate-900 dark:text-white">{activeItems.length}</strong>
                        {items.length - activeItems.length > 0 && (
                          <span>
                            {' '}
                            · {items.length - activeItems.length} {t('portfolio.excludedCount')}
                          </span>
                        )}
                      </span>
                      <span>
                        {t('portfolio.aiScore')}:{' '}
                        <strong className="font-semibold tabular-nums text-slate-900 dark:text-white">
                          {ratedCount}/{items.length}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setForm(emptyForm());
                        setMoreOpen(false);
                        setFormOpen((v) => !v);
                      }}
                      aria-expanded={formOpen}
                      className="ar-btn ar-btn-primary"
                    >
                      <Plus className="w-4 h-4" /> {t('portfolio.add')}
                    </button>
                    <button type="button" onClick={runEvaluation} disabled={evaluating || !items.length} aria-busy={evaluating} className="ar-btn ar-btn-secondary">
                      {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4 text-blue-600 dark:text-blue-400" />} {t('portfolio.evaluateNow')}
                    </button>
                  </div>
                </div>

                {/* Quick-add form (doc §7: name · level · result · short description) */}
                {formOpen && (
                  <form onSubmit={save} className={`${panelCls} p-4 sm:p-5 space-y-4 animate-fadeIn`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h4 className={blockTitleCls}>{editingId ? t('common.edit') : t('portfolio.add')}</h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 hidden sm:block">{t('portfolio.quickHint')}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 min-w-0">
                        <label className={labelCls}>{t('portfolio.f.title')}</label>
                        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('portfolio.f.titlePh')} className="ar-input" required maxLength={160} autoFocus />
                      </div>
                      <div className="min-w-0">
                        <label className={labelCls}>{t('portfolio.f.type')}</label>
                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PortfolioItemType })} className="ar-input">
                          {(meta?.types || []).map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className={labelCls}>{t('portfolio.f.level')}</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(meta?.levels || []).map((x) => {
                            const on = form.level === x.id;
                            return (
                              <button
                                key={x.id}
                                type="button"
                                aria-pressed={on}
                                onClick={() => setForm({ ...form, level: on ? null : (x.id as PortfolioLevel) })}
                                className="ar-chip"
                              >
                                {x.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <label className={labelCls}>{t('portfolio.f.result')}</label>
                        <select value={form.result || ''} onChange={(e) => setForm({ ...form, result: (e.target.value || null) as PortfolioResult | null })} className="ar-input">
                          <option value="">—</option>
                          {(meta?.results || []).map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{t('portfolio.f.description')}</label>
                      <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder={t('portfolio.f.descriptionPh')} className="ar-input" maxLength={2000} />
                    </div>

                    <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} className="ar-link text-sm min-h-8">
                      {moreOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {moreOpen ? t('portfolio.less') : t('portfolio.more')}
                    </button>

                    {moreOpen && (
                      <div className="space-y-3 animate-fadeIn">
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                          <div className="col-span-2 min-w-0">
                            <label className={labelCls}>{t('portfolio.f.organization')}</label>
                            <input value={form.organization || ''} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="РФМШ, Astana Hub, MIT…" className="ar-input" maxLength={160} />
                          </div>
                          <div className="col-span-2 lg:col-span-1 min-w-0">
                            <label className={labelCls}>{t('portfolio.f.role')}</label>
                            <input value={form.role || ''} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder={t('portfolio.f.rolePh')} className="ar-input" maxLength={120} />
                          </div>
                          <div className="min-w-0">
                            <label className={labelCls}>{t('portfolio.f.start')}</label>
                            <input type="month" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value || null })} className="ar-input min-w-0" />
                          </div>
                          <div className="min-w-0">
                            <label className={labelCls}>{t('portfolio.f.end')}</label>
                            <input type="month" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value || null })} className="ar-input min-w-0" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="min-w-0">
                            <label className={labelCls}>{t('portfolio.f.hours')}</label>
                            <input type="number" min={0} max={80} value={form.hoursPerWeek ?? ''} onChange={(e) => setForm({ ...form, hoursPerWeek: e.target.value === '' ? null : Number(e.target.value) })} className="ar-input" />
                          </div>
                          <div className="min-w-0">
                            <label className={labelCls}>{t('portfolio.f.links')}</label>
                            <div className="flex gap-2">
                              <input value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="https://github.com/…" className="ar-input min-w-0" />
                              <button type="button" onClick={addLink} className="ar-btn ar-btn-secondary w-11 px-0 shrink-0" aria-label={t('common.add')} title={t('common.add')}>
                                <Link2 className="w-4 h-4" />
                              </button>
                            </div>
                            {!!form.links?.length && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {form.links.map((l) => (
                                  <span key={l} className="inline-flex items-center gap-0.5 pl-2.5 pr-0.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-xs text-slate-700 dark:text-zinc-200 max-w-full">
                                    <span className="truncate max-w-[180px]">{l.replace(/^https?:\/\//, '')}</span>
                                    <button
                                      type="button"
                                      onClick={() => setForm({ ...form, links: form.links!.filter((x) => x !== l) })}
                                      aria-label={t('common.delete')}
                                      className="w-6 h-6 shrink-0 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-500/10 transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <label className={labelCls}>{t('portfolio.f.document')}</label>
                            <select value={form.documentId || ''} onChange={(e) => setForm({ ...form, documentId: e.target.value || null })} className="ar-input">
                              <option value="">{t('portfolio.f.noDocument')}</option>
                              {documents.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.originalName}
                                </option>
                              ))}
                            </select>
                            <p className="ar-hint">{t('portfolio.f.documentHint')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormOpen(false);
                          setEditingId(null);
                        }}
                        className="ar-btn ar-btn-secondary"
                      >
                        {t('common.cancel')}
                      </button>
                      <button type="submit" disabled={saving || !form.title?.trim()} aria-busy={saving} className="ar-btn ar-btn-primary">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {editingId ? t('common.save') : t('portfolio.add')}
                      </button>
                    </div>
                  </form>
                )}

                {/* List */}
                {loading && !items.length ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400 py-8 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
                  </div>
                ) : !items.length ? (
                  <div className="px-6 py-10 rounded-xl border border-dashed border-[var(--line-strong)] text-center flex flex-col items-center">
                    <span className="ar-icon-tile w-11 h-11">
                      <Trophy className="w-5 h-5" />
                    </span>
                    <p className="text-base font-semibold text-slate-900 dark:text-white mt-3">{t('portfolio.emptyTitle')}</p>
                    <p className="text-sm text-slate-600 dark:text-zinc-400 max-w-md mt-1 leading-relaxed">{t('portfolio.emptyHint')}</p>
                    {!formOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm(emptyForm());
                          setFormOpen(true);
                        }}
                        className="ar-btn ar-btn-primary mt-4"
                      >
                        <Plus className="w-4 h-4" /> {t('portfolio.add')}
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {sortedForList.map((it) => {
                      const scoreValue = it.ai?.score ?? it.preScore ?? null;
                      const rec = it.ai?.recommendation;
                      return (
                        <li key={it.id} className={`${panelCls} p-4 transition-colors ${it.excluded ? 'opacity-60' : 'hover:border-[var(--line-strong)]'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className={microLabelCls}>{typeLabel(it.type)}</span>
                                {it.excluded && (
                                  <span className="ar-badge">
                                    <EyeOff className="w-3 h-3" /> {t('portfolio.excludedBadge')}
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm font-semibold text-slate-900 dark:text-white mt-1 break-words ${it.excluded ? 'line-through decoration-slate-400' : ''}`}>{it.title}</p>
                              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">{[it.organization, levelLabel(it.level), resultLabel(it.result), it.role].filter(Boolean).join(' · ')}</p>
                              {it.description && <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">{it.description}</p>}

                              {it.ai ? (
                                <div className="mt-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] p-3 space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-1 ${microLabelCls}`}>
                                      <MessageSquareText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> {t('portfolio.conclusion')}
                                    </span>
                                    {rec && <span className={`ar-badge ${recTone(rec)}`}>{t(`portfolio.rec.${rec}`)}</span>}
                                    {it.ai.useInEssay && (
                                      <span className="ar-badge bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                                        <Quote className="w-3 h-3" /> {t('portfolio.useInEssay')}
                                      </span>
                                    )}
                                  </div>
                                  {it.ai.verdict && <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">{it.ai.verdict}</p>}
                                </div>
                              ) : (
                                <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400 flex items-start gap-1.5">
                                  <ScanSearch className="w-3.5 h-3.5 shrink-0 mt-px" /> {t('portfolio.notEvaluated')}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500 dark:text-zinc-400">
                                {(it.startDate || it.endDate) && (
                                  <span>
                                    {it.startDate || '?'} – {it.endDate || t('portfolio.present')}
                                  </span>
                                )}
                                {it.hoursPerWeek ? (
                                  <span>
                                    {it.hoursPerWeek} {t('common.hoursPerWeek')}
                                  </span>
                                ) : null}
                                {it.documentId && (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                                    <FileText className="w-3 h-3" /> {t('portfolio.hasProof')}
                                  </span>
                                )}
                                {it.links.slice(0, 2).map((l) => (
                                  <a key={l} href={l} target="_blank" rel="noreferrer" className="ar-link font-medium min-w-0">
                                    <ExternalLink className="w-3 h-3 shrink-0" /> <span className="truncate">{l.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                                  </a>
                                ))}
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                              {scoreValue !== null && (
                                <div className="sm:text-right">
                                  <ScoreChip score={scoreValue} label={it.ai ? t('portfolio.aiScore') : t('portfolio.preScore')} muted={!it.ai || it.excluded} />
                                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">{it.ai ? t('portfolio.aiScore') : t('portfolio.preScore')}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-0.5 ml-auto sm:ml-0">
                                <button
                                  type="button"
                                  onClick={() => toggleExcluded(it)}
                                  disabled={togglingId === it.id}
                                  aria-busy={togglingId === it.id}
                                  className="ar-btn ar-btn-quiet ar-btn-sm min-h-9 px-2.5"
                                  title={it.excluded ? t('portfolio.include') : t('portfolio.exclude')}
                                  aria-label={it.excluded ? t('portfolio.include') : t('portfolio.exclude')}
                                >
                                  {togglingId === it.id ? <Loader2 className="w-4 h-4 animate-spin" /> : it.excluded ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                  <span className="hidden md:inline">{it.excluded ? t('portfolio.include') : t('portfolio.exclude')}</span>
                                </button>
                                <button type="button" onClick={() => startEdit(it)} className="ar-btn ar-btn-icon w-9 h-9" title={t('common.edit')} aria-label={t('common.edit')}>
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => remove(it)}
                                  className="ar-btn ar-btn-icon w-9 h-9 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-500/10"
                                  title={t('common.delete')}
                                  aria-label={t('common.delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {/* ============================================================ EVALUATE */}
            {tab === 'evaluate' && (
              <>
                <div className={`${softPanelCls} p-4 sm:p-5 space-y-4`}>
                  <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">{t('portfolio.evalIntro')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className={labelCls}>{t('portfolio.evalField')}</label>
                      <select value={field} onChange={(e) => setField(e.target.value as PortfolioFieldId | '')} className="ar-input">
                        <option value="">{t('portfolio.evalFieldAuto')}</option>
                        {(meta?.fields || []).map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className={labelCls}>{t('portfolio.evalTargets')}</label>
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <span className="ar-icon-tile w-8 h-8">{manualTargets ? <ListChecks className="w-4 h-4" /> : <Target className="w-4 h-4" />}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{manualTargets ? t('portfolio.targets.manualTitle') : t('portfolio.targets.autoTitle')}</p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed mt-0.5">{manualTargets ? t('portfolio.targets.manualHint') : t('portfolio.targets.autoHint')}</p>
                          </div>
                        </div>
                        {manualTargets && (
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] animate-fadeIn">
                            {UNIVERSITY_DATABASE.filter((u) => targetIds.includes(u.id) || (profile.targetRegions || []).includes(u.region))
                              .slice(0, 40)
                              .map((u) => {
                                const on = targetIds.includes(u.id);
                                return (
                                  <button
                                    key={u.id}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setTargetIds((prev) => (on ? prev.filter((x) => x !== u.id) : prev.length >= 6 ? prev : [...prev, u.id]))}
                                    className="ar-chip min-h-8 py-1 pl-1 pr-2.5 text-xs font-semibold"
                                  >
                                    <UniversityCrest uni={u} size={20} rounded="rounded-md" />
                                    {u.shortName}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                        <button type="button" onClick={() => setManualTargets((v) => !v)} className="ar-link text-xs min-h-8">
                          {manualTargets ? <Target className="w-3.5 h-3.5" /> : <ListChecks className="w-3.5 h-3.5" />}
                          {manualTargets ? t('portfolio.targets.useAuto') : `${t('portfolio.targets.useManual')} (${targetIds.length}/6)`}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={runEvaluation} disabled={evaluating || !items.length} aria-busy={evaluating} className="ar-btn ar-btn-primary w-full min-h-11">
                    {evaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> <span className="truncate min-w-0">{evalCaption || t('portfolio.evaluating')}</span>
                      </>
                    ) : (
                      <>
                        <ScanSearch className="w-4 h-4" /> {t('portfolio.evaluate')}
                      </>
                    )}
                  </button>
                  {!items.length && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {t('portfolio.needItems')}
                    </p>
                  )}
                  {evalError && (
                    <div className="ar-notice ar-notice-error" role="alert">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="min-w-0">{evalError}</span>
                    </div>
                  )}
                </div>

                {evaluation && (
                  <div className="space-y-3 animate-fadeIn">
                    {/* Overall verdict */}
                    <div className={`${panelCls} p-4 sm:p-5 flex flex-col sm:flex-row gap-4`}>
                      <ScoreRing value={evaluation.overallScore} size={104} />
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`ar-badge ${tierCls(evaluation.tier)}`}>{t(`portfolio.tier.${evaluation.tier}`)}</span>
                          <span className="text-xs text-slate-500 dark:text-zinc-400">{evaluation.fieldTitle}</span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 sm:ml-auto">{evaluation.model}</span>
                        </div>
                        <h4 className={blockTitleCls}>{evaluation.headline}</h4>
                        <Markdown text={evaluation.summary} compact />
                      </div>
                    </div>

                    {/* Universities the engine picked from the preferences (doc §11) */}
                    {evaluation.targetsAuto && evaluation.targets.length > 0 && (
                      <div className={`${panelCls} p-4 sm:p-5`}>
                        <div className="flex items-start gap-3 mb-3">
                          <span className="ar-icon-tile w-8 h-8">
                            <Target className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <h4 className={blockTitleCls}>{t('portfolio.targets.chosenTitle')}</h4>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t('portfolio.targets.chosenHint')}</p>
                          </div>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {evaluation.targets.map((u) => (
                            <li key={u.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex items-center gap-2">
                                  {(() => {
                                    const full = UNIVERSITY_DATABASE.find((x) => x.id === u.id);
                                    return full ? <UniversityCrest uni={full} size={30} rounded="rounded-lg" /> : null;
                                  })()}
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{u.shortName || u.name}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{u.name}</p>
                                  </div>
                                </div>
                                {u.tier && (
                                  <span
                                    className={`ar-badge shrink-0 ${
                                      u.tier === 'Safety' ? 'ar-badge-green' : u.tier === 'Dream' ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200' : 'ar-badge-blue'
                                    }`}
                                  >
                                    {t(`portfolio.targets.tier.${u.tier}`)}
                                  </span>
                                )}
                              </div>
                              {(u.fit !== undefined || u.probability !== undefined) && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xs text-slate-500 dark:text-zinc-400">
                                  {u.fit !== undefined && (
                                    <span>
                                      {t('portfolio.targets.fit')} <strong className="font-semibold tabular-nums text-slate-900 dark:text-white">{u.fit}%</strong>
                                    </span>
                                  )}
                                  {u.probability !== undefined && (
                                    <span>
                                      {t('ai.analyze.chance')} <strong className="font-semibold tabular-nums text-slate-900 dark:text-white">{u.probability}%</strong>
                                    </span>
                                  )}
                                </div>
                              )}
                              {u.reasons?.length ? <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">{u.reasons.map((r) => tx(r)).join(' · ')}</p> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Per-activity 1–10 (doc §15) */}
                    {evaluatedItems.length > 0 && (
                      <div className={`${panelCls} p-4 sm:p-5`}>
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <h4 className={`${blockTitleCls} flex items-center gap-2`}>
                              <Star className="w-4 h-4 shrink-0 text-amber-500" /> {t('portfolio.itemsTitle')}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t('portfolio.itemsHint')}</p>
                          </div>
                          <button type="button" onClick={() => setTab('items')} className="ar-link text-xs min-h-8">
                            {t('portfolio.tab.items')} <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <ol className="space-y-2">
                          {evaluatedItems.map((r, idx) => {
                            const it = items.find((x) => x.id === r.id);
                            return (
                              <li key={r.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3">
                                <div className="flex items-start gap-3">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center justify-center shrink-0 tabular-nums">{idx + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span className="text-sm font-semibold text-slate-900 dark:text-white break-words">{r.title}</span>
                                      {it && <span className="text-[11px] text-slate-500 dark:text-zinc-400">{typeLabel(it.type)}</span>}
                                      <span className={`ar-badge ${recTone(r.recommendation)}`}>{t(`portfolio.rec.${r.recommendation}`)}</span>
                                      {r.useInEssay && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                                          <Quote className="w-3 h-3" /> {t('portfolio.useInEssay')}
                                        </span>
                                      )}
                                      {it?.excluded && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                                          <EyeOff className="w-3 h-3" /> {t('portfolio.excludedBadge')}
                                        </span>
                                      )}
                                    </div>
                                    {r.verdict && <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed mt-1">{r.verdict}</p>}
                                    {it && r.recommendation === 'drop' && !it.excluded && (
                                      <button
                                        type="button"
                                        onClick={() => toggleExcluded(it)}
                                        className="mt-1.5 inline-flex items-center gap-1 min-h-8 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline underline-offset-[3px] dark:text-zinc-300 dark:hover:text-white"
                                      >
                                        <EyeOff className="w-3.5 h-3.5" /> {t('portfolio.exclude')}
                                      </button>
                                    )}
                                  </div>
                                  <ScoreChip score={r.score} label={t('portfolio.aiScore')} />
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}

                    <div className={`${panelCls} p-4 sm:p-5 space-y-3`}>
                      <div className={microLabelCls}>{t('portfolio.byCriteria')}</div>
                      {evaluation.criteria.map((c) => (
                        <div key={c.id}>
                          <div className="flex items-baseline justify-between gap-3 text-xs mb-1">
                            <span className="text-slate-800 dark:text-zinc-100 font-semibold min-w-0">
                              {t(`portfolio.criteria.${c.id}`)}{' '}
                              <span className="text-slate-500 dark:text-zinc-400 font-normal">
                                · {t('portfolio.weight')} {Math.round(c.weight * 100)}%
                              </span>
                            </span>
                            <span className="font-semibold tabular-nums text-slate-900 dark:text-white shrink-0">{c.score}</span>
                          </div>
                          <Bar value={c.score} computed={c.computed} />
                          {c.comment && <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">{c.comment}</p>}
                        </div>
                      ))}
                    </div>

                    {evaluation.perUniversity?.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {evaluation.perUniversity.map((u) => (
                          <div key={u.id} className={`${panelCls} p-4 space-y-1.5 min-w-0`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white min-w-0">{u.name}</div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                                  {u.fit}
                                  <span className="text-[11px] font-normal text-slate-500 dark:text-zinc-400"> / 100</span>
                                </div>
                                {u.chance !== null && (
                                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                                    {t('ai.analyze.chance')} {u.chance}%
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">{u.verdict}</p>
                            {u.whatTheyValue && (
                              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                                <span className="font-semibold text-slate-700 dark:text-zinc-200">{t('portfolio.whatTheyValue')}:</span> {u.whatTheyValue}
                              </p>
                            )}
                            {u.gaps?.length > 0 && (
                              <ul className="list-disc pl-4 text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                                {u.gaps.map((g, i) => (
                                  <li key={i}>{g}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {evaluation.strengths?.length > 0 && (
                        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                          <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5 inline-flex items-center gap-1">
                            <BadgeCheck className="w-3.5 h-3.5" /> {t('ai.essay.strengths')}
                          </div>
                          <ul className="list-disc pl-4 text-emerald-900 dark:text-emerald-100 space-y-1 leading-relaxed">
                            {evaluation.strengths.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {evaluation.gaps?.length > 0 && (
                        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/10">
                          <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-amber-800 dark:text-amber-300 mb-1.5">{t('portfolio.gaps')}</div>
                          <ul className="list-disc pl-4 text-amber-900 dark:text-amber-100 space-y-1 leading-relaxed">
                            {evaluation.gaps.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {evaluation.fieldAdvice && (
                      <div className={`${panelCls} p-4`}>
                        <div className={`${microLabelCls} mb-1.5`}>{t('portfolio.fieldAdvice')}</div>
                        <Markdown text={evaluation.fieldAdvice} compact />
                      </div>
                    )}

                    {evaluation.actionPlan?.length > 0 && (
                      <div className={`${panelCls} p-4`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className={microLabelCls}>{t('portfolio.actionPlan')}</div>
                          <button type="button" onClick={addPlanToTasks} className="ar-btn ar-btn-secondary ar-btn-sm">
                            <ListPlus className="w-4 h-4" /> {t('ai.analyze.addTasks')}
                          </button>
                        </div>
                        <ul className="space-y-2">
                          {evaluation.actionPlan.map((a, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${a.priority === 'high' ? 'bg-rose-500' : a.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-zinc-600'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-white min-w-0">{a.title}</span>
                                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums shrink-0">{a.deadline}</span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">{a.why}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.suggestedCompetitions?.length > 0 && (
                      <div className={`${panelCls} p-4`}>
                        <div className={`${microLabelCls} mb-2`}>{t('portfolio.suggestedCompetitions')}</div>
                        <ul className="space-y-1.5 leading-relaxed">
                          {evaluation.suggestedCompetitions.map((c) => (
                            <li key={c.id} className="text-slate-700 dark:text-zinc-300">
                              <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 hover:underline underline-offset-[3px]">
                                {c.name}
                              </a>{' '}
                              — {c.why}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(evaluation.essayAngles?.length > 0 || evaluation.redFlags?.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {evaluation.essayAngles?.length > 0 && (
                          <div className={`${panelCls} p-4`}>
                            <div className={`${microLabelCls} mb-1.5`}>{t('portfolio.essayAngles')}</div>
                            <ul className="list-disc pl-4 text-slate-700 dark:text-zinc-300 space-y-1 leading-relaxed">
                              {evaluation.essayAngles.map((x, i) => (
                                <li key={i}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {evaluation.redFlags?.length > 0 && (
                          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-500/25 dark:bg-rose-500/10">
                            <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-rose-800 dark:text-rose-300 mb-1.5">{t('ai.analyze.redFlags')}</div>
                            <ul className="list-disc pl-4 text-rose-900 dark:text-rose-100 space-y-1 leading-relaxed">
                              {evaluation.redFlags.map((x, i) => (
                                <li key={i}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!evaluation && !evaluating && ratedCount > 0 && (
                  <div className={`${panelCls} p-4 sm:p-5`}>
                    <h4 className={`${blockTitleCls} flex items-center gap-2 mb-0.5`}>
                      <Star className="w-4 h-4 shrink-0 text-amber-500" /> {t('portfolio.itemsTitle')}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">{t('portfolio.lastVerdicts')}</p>
                    <ol className="space-y-2">
                      {sortedForList
                        .filter((it) => it.ai)
                        .map((it) => (
                          <li key={it.id} className={`rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3 ${it.excluded ? 'opacity-60' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="text-sm font-semibold text-slate-900 dark:text-white break-words">{it.title}</span>
                                  <span className={`ar-badge ${recTone(it.ai!.recommendation)}`}>{t(`portfolio.rec.${it.ai!.recommendation}`)}</span>
                                </div>
                                {it.ai!.verdict && <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed mt-1">{it.ai!.verdict}</p>}
                              </div>
                              <ScoreChip score={it.ai!.score} label={t('portfolio.aiScore')} />
                            </div>
                          </li>
                        ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
