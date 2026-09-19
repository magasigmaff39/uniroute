import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { X, Copy, Check, FileText, Lightbulb, ArrowLeft, ArrowRight, Plus, Trash2, MessageSquareText, Loader2, Quote, HelpCircle, ChevronDown, ChevronUp, CheckCircle2, Info } from 'lucide-react';
import type { ApplicantProfile, EssayDraft, EssayFeedback, EssayProject, EssayStage, PortfolioItem, University } from '../types';
import { aiApi, setUiState } from '../lib/api';
import { UniversityCrest } from './ui/UniversityCrest';
import { useProgressCaptions } from '../hooks/useProgressCaptions';
import { describeApiError } from './planner/ui';
import { ESSAY_STAGES, essayStageDone } from '../utils/essay';

interface EssayArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ApplicantProfile;
  /** The applicant's selected universities — picked from, never typed in */
  universities?: University[];
  /** Portfolio entries a project can be started from */
  portfolio?: PortfolioItem[];
  /** Saved draft (planner) and where to save edits */
  initialDraft?: EssayDraft | null;
  onSaveDraft?: (draft: EssayDraft) => void;
}

const STAGES = ESSAY_STAGES;
const MAX_PROJECTS = 3;

const emptyProject = (): EssayProject => ({ title: '', problem: '', role: '', methods: '', result: '', skills: '', link: '' });
const emptyDraft = (): EssayDraft => ({
  hook: '',
  projects: [emptyProject()],
  university: { universityId: '', program: '', whyUniversity: '', whyProgram: '', features: '', opportunities: '', experienceLink: '' },
  future: { academic: '', professional: '', direction: '', problems: '', howHelps: '' },
});

/** Accepts drafts saved by older versions (missing fields) without losing what was written. */
function normalizeDraft(d: EssayDraft | null | undefined): EssayDraft {
  const base = emptyDraft();
  if (!d) return base;
  return {
    hook: typeof d.hook === 'string' ? d.hook : '',
    projects: Array.isArray(d.projects) && d.projects.length ? d.projects.map((p) => ({ ...emptyProject(), ...p })) : base.projects,
    university: { ...base.university, ...(d.university || {}) },
    future: { ...base.future, ...(d.future || {}) },
    updatedAt: d.updatedAt,
  };
}

const words = (v: string) => (v.trim() ? v.trim().split(/\s+/).length : 0);
const stageDone = essayStageDone;

const stageText = (stage: EssayStage, d: EssayDraft) =>
  stage === 'hook'
    ? d.hook
    : stage === 'projects'
      ? d.projects.flatMap((p) => Object.values(p)).join(' ')
      : stage === 'university'
        ? Object.entries(d.university)
            .filter(([k]) => k !== 'universityId')
            .map(([, v]) => v)
            .join(' ')
        : Object.values(d.future).join(' ');

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable (insecure context, permissions): fall back to a hidden textarea.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/**
 * «Конструктор мотивационного письма»: a modal over the current page. The applicant writes their own text in
 * four stages (impulse → projects → university → prospects); the AI only reviews it, stage by stage.
 */
export const EssayArchitectModal: React.FC<EssayArchitectModalProps> = ({ isOpen, onClose, profile, universities = [], portfolio = [], initialDraft, onSaveDraft }) => {
  const { t, lang } = useI18n();
  const [stage, setStage] = useState<EssayStage>('hook');
  const [draft, setDraft] = useState<EssayDraft>(() => normalizeDraft(initialDraft));
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const [feedback, setFeedback] = useState<Partial<Record<EssayStage | 'all', EssayFeedback>>>({});
  const [reviewing, setReviewing] = useState<EssayStage | 'all' | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [factsOpen, setFactsOpen] = useState(false);
  const touched = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reviewCaption = useProgressCaptions(Boolean(reviewing), [t('progress.reading'), t('essay.ai.progress'), t('progress.finishing')]);

  // A draft saved on another device arrives after mount: take it while nothing was typed here yet.
  useEffect(() => {
    if (isOpen && initialDraft && !touched.current) setDraft(normalizeDraft(initialDraft));
  }, [isOpen, initialDraft]);

  // Keep the university choice valid: default to the first selected university, drop one that was removed.
  useEffect(() => {
    if (!isOpen) return;
    const id = draft.university.universityId;
    if (id && universities.some((u) => u.id === id)) return;
    const first = universities[0];
    setDraft((d) => ({ ...d, university: { ...d.university, universityId: first?.id || '', program: d.university.program || (first ? profile.universityPlans?.[first.id]?.program || '' : '') } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, universities]);

  const outline = useMemo(() => buildOutline(draft, profile, universities, t), [draft, profile, universities, t]);

  // Save a moment after typing stops; the chat assistant also sees the current draft.
  useEffect(() => {
    if (!touched.current) return;
    const timer = window.setTimeout(() => {
      onSaveDraft?.(draft);
      setUiState({ essayDraft: outline.slice(0, 4000) });
    }, 800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Closing (button, Escape, backdrop) saves the latest text at once instead of waiting for the debounce.
  const latest = useRef({ draft, onSaveDraft, onClose });
  useEffect(() => {
    latest.current = { draft, onSaveDraft, onClose };
  });
  const handleClose = () => {
    if (touched.current) latest.current.onSaveDraft?.(latest.current.draft);
    latest.current.onClose();
  };

  // Escape closes; focus moves into the dialog when it opens.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true }));
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const edit = (fn: (d: EssayDraft) => EssayDraft) => {
    touched.current = true;
    setDraft(fn);
  };
  const setProject = (i: number, patch: Partial<EssayProject>) => edit((d) => ({ ...d, projects: d.projects.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const setUni = (patch: Partial<EssayDraft['university']>) => edit((d) => ({ ...d, university: { ...d.university, ...patch } }));
  const setFuture = (patch: Partial<EssayDraft['future']>) => edit((d) => ({ ...d, future: { ...d.future, ...patch } }));

  const index = STAGES.indexOf(stage);
  const selectedUni = universities.find((u) => u.id === draft.university.universityId) || null;
  const projectSources = portfolio.filter((it) => !it.excluded && ['project', 'research', 'competition', 'olympiad', 'internship', 'volunteering', 'leadership'].includes(it.type));

  const handleCopy = async () => {
    const ok = await copyText(outline);
    setCopied(ok ? 'ok' : 'fail');
    window.setTimeout(() => setCopied(null), 2200);
  };

  const review = async (which: EssayStage | 'all') => {
    setReviewing(which);
    setReviewError(null);
    try {
      const res = await aiApi.essayFeedback(which, draft, draft.university.universityId || undefined, profile, lang);
      setFeedback((f) => ({ ...f, [which]: res }));
    } catch (err) {
      setReviewError(describeApiError(t, err));
    } finally {
      setReviewing(null);
    }
  };

  const canReview = (which: EssayStage | 'all') => (which === 'all' ? STAGES.map((s) => stageText(s, draft)).join(' ') : stageText(which, draft)).trim().length >= 40;

  const selectUniversity = (u: University) => {
    const plan = profile.universityPlans?.[u.id]?.program;
    setUni({ universityId: u.id, program: draft.university.universityId === u.id ? draft.university.program : plan || '' });
  };

  const importProject = (i: number, itemId: string) => {
    const it = projectSources.find((x) => x.id === itemId);
    if (!it) return;
    setProject(i, { title: it.title, role: draft.projects[i].role || it.role || '', problem: draft.projects[i].problem || it.description || '' });
  };

  const hint = (key: string) => (
    <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-xl border border-violet-100 bg-violet-50/60 dark:border-violet-500/20 dark:bg-violet-500/10 text-xs sm:text-[13px] text-slate-700 dark:text-zinc-300 leading-relaxed">
      <Lightbulb className="w-4 h-4 text-violet-600 dark:text-violet-300 shrink-0 mt-0.5" />
      <span className="min-w-0">
        <strong className="font-semibold text-slate-900 dark:text-white">{t('essay.method')}:</strong> {t(key)}
      </span>
    </div>
  );

  const fb = feedback[stage];
  const fbAll = feedback.all;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="essay-title"
        className="w-full max-w-3xl flex flex-col overflow-hidden max-h-[calc(100dvh-1rem)] sm:max-h-[min(90dvh,calc(100dvh-3rem))] bg-[var(--surface-raised)] rounded-2xl border border-[var(--line)] shadow-[var(--shadow-overlay)] animate-popIn"
      >
        {/* Header */}
        <div className="shrink-0 pl-4 pr-2.5 sm:pl-6 sm:pr-4 py-3.5 sm:py-4 border-b border-[var(--line)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="ar-icon-tile bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
              <FileText className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0">
              <h3 id="essay-title" className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-snug">
                {t('essay.title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t('essay.subtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} data-autofocus aria-label={t('essay.close')} title={t('essay.close')} className="ar-btn ar-btn-icon shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Four stages: a horizontal scroller on phones, equal columns from sm up */}
        <div
          role="tablist"
          aria-label={t('essay.stages')}
          className="shrink-0 flex overflow-x-auto px-2 sm:px-4 shadow-[inset_0_-1px_0_var(--line)] bg-[var(--surface-subtle)] hide-scrollbar"
        >
          {STAGES.map((s, i) => {
            const active = s === stage;
            const done = stageDone(s, draft);
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStage(s)}
                className={`shrink-0 sm:flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 py-2.5 border-b-2 text-[13px] whitespace-nowrap transition-colors ${
                  active
                    ? 'border-blue-600 dark:border-blue-400 text-slate-900 dark:text-white font-semibold'
                    : 'border-transparent text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-zinc-600'
                }`}
              >
                {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />}
                {i + 1}. {t(`essay.stage.${s}`)}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">{t('essay.position', { n: index + 1, total: STAGES.length })}</p>

          {stage === 'hook' && (
            <div className="space-y-3">
              {hint('essay.hint.hook')}
              <Field id="essay-hook" label={t('essay.f.hook')} value={draft.hook} onChange={(v) => edit((d) => ({ ...d, hook: v }))} placeholder={t('essay.ph.hook')} rows={7} counter />
            </div>
          )}

          {stage === 'projects' && (
            <div className="space-y-3">
              {hint('essay.hint.projects')}
              {draft.projects.map((p, i) => (
                <fieldset key={i} className="min-w-0 rounded-2xl border border-[var(--line)] p-3.5 sm:p-4 space-y-3">
                  <legend className="px-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">{t('essay.project', { n: i + 1 })}</legend>
                  {projectSources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      <label htmlFor={`essay-import-${i}`} className="text-xs text-slate-500 dark:text-zinc-400">{t('essay.fromPortfolio')}:</label>
                      <select id={`essay-import-${i}`} value="" onChange={(e) => importProject(i, e.target.value)} className="ar-input w-auto min-w-0 max-w-full min-h-9 py-1.5 sm:text-xs">
                        <option value="">{t('essay.fromPortfolio.pick')}</option>
                        {projectSources.map((it) => (
                          <option key={it.id} value={it.id}>{it.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field id={`p${i}-title`} label={t('essay.f.projectTitle')} value={p.title} onChange={(v) => setProject(i, { title: v })} placeholder={t('essay.ph.projectTitle')} />
                    <Field id={`p${i}-role`} label={t('essay.f.role')} value={p.role} onChange={(v) => setProject(i, { role: v })} placeholder={t('essay.ph.role')} />
                  </div>
                  <Field id={`p${i}-problem`} label={t('essay.f.problem')} value={p.problem} onChange={(v) => setProject(i, { problem: v })} placeholder={t('essay.ph.problem')} rows={3} />
                  <Field id={`p${i}-methods`} label={t('essay.f.methods')} value={p.methods} onChange={(v) => setProject(i, { methods: v })} placeholder={t('essay.ph.methods')} />
                  <Field id={`p${i}-result`} label={t('essay.f.result')} value={p.result} onChange={(v) => setProject(i, { result: v })} placeholder={t('essay.ph.result')} rows={2} />
                  <Field id={`p${i}-skills`} label={t('essay.f.skills')} value={p.skills} onChange={(v) => setProject(i, { skills: v })} placeholder={t('essay.ph.skills')} />
                  <Field id={`p${i}-link`} label={t('essay.f.link')} value={p.link} onChange={(v) => setProject(i, { link: v })} placeholder={t('essay.ph.link')} rows={2} />
                  {draft.projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => edit((d) => ({ ...d, projects: d.projects.filter((_, j) => j !== i) }))}
                      className="ar-btn ar-btn-quiet ar-btn-sm -ml-2 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t('essay.removeProject')}
                    </button>
                  )}
                </fieldset>
              ))}
              {draft.projects.length < MAX_PROJECTS && (
                <button type="button" onClick={() => edit((d) => ({ ...d, projects: [...d.projects, emptyProject()] }))} className="ar-btn ar-btn-secondary ar-btn-sm border-dashed">
                  <Plus className="w-3.5 h-3.5" /> {t('essay.addProject')}
                </button>
              )}
            </div>
          )}

          {stage === 'university' && (
            <div className="space-y-3">
              {hint('essay.hint.university')}
              <div>
                <p className="ar-label">{t('essay.f.university')}</p>
                {universities.length ? (
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('essay.f.university')}>
                    {universities.map((u) => {
                      const on = u.id === draft.university.universityId;
                      return (
                        <button key={u.id} type="button" role="radio" aria-checked={on} onClick={() => selectUniversity(u)} className="ar-chip max-w-full min-h-10 pl-1.5 pr-3 py-1 gap-2 font-semibold">
                          <UniversityCrest uni={u} size={26} rounded="rounded-lg" /> <span className="truncate">{u.shortName}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 p-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 leading-relaxed">{t('essay.noUniversities')}</p>
                )}
              </div>
              {selectedUni && (
                <>
                  <Field id="essay-program" label={t('essay.f.program')} value={draft.university.program} onChange={(v) => setUni({ program: v })} placeholder={selectedUni.flagshipPrograms[0] || ''} list="essay-programs" />
                  <datalist id="essay-programs">
                    {selectedUni.flagshipPrograms.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                  <div className="rounded-xl border border-[var(--line)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFactsOpen((v) => !v)}
                      aria-expanded={factsOpen}
                      className="w-full min-h-10 flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <Info className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" /> {t('essay.facts', { name: selectedUni.shortName })}
                      </span>
                      {factsOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>
                    {factsOpen && <UniversityFacts uni={selectedUni} t={t} />}
                  </div>
                  <Field id="essay-why-uni" label={t('essay.f.whyUniversity')} value={draft.university.whyUniversity} onChange={(v) => setUni({ whyUniversity: v })} placeholder={t('essay.ph.whyUniversity')} rows={3} />
                  <Field id="essay-why-program" label={t('essay.f.whyProgram')} value={draft.university.whyProgram} onChange={(v) => setUni({ whyProgram: v })} placeholder={t('essay.ph.whyProgram')} rows={3} />
                  <Field id="essay-features" label={t('essay.f.features')} value={draft.university.features} onChange={(v) => setUni({ features: v })} placeholder={t('essay.ph.features')} rows={2} />
                  <Field id="essay-opportunities" label={t('essay.f.opportunities')} value={draft.university.opportunities} onChange={(v) => setUni({ opportunities: v })} placeholder={t('essay.ph.opportunities')} rows={2} />
                  <Field id="essay-experience" label={t('essay.f.experienceLink')} value={draft.university.experienceLink} onChange={(v) => setUni({ experienceLink: v })} placeholder={t('essay.ph.experienceLink')} rows={2} />
                </>
              )}
            </div>
          )}

          {stage === 'future' && (
            <div className="space-y-3">
              {hint('essay.hint.future')}
              <Field id="essay-academic" label={t('essay.f.academic')} value={draft.future.academic} onChange={(v) => setFuture({ academic: v })} placeholder={t('essay.ph.academic')} rows={2} />
              <Field id="essay-professional" label={t('essay.f.professional')} value={draft.future.professional} onChange={(v) => setFuture({ professional: v })} placeholder={t('essay.ph.professional')} rows={2} />
              <Field id="essay-direction" label={t('essay.f.direction')} value={draft.future.direction} onChange={(v) => setFuture({ direction: v })} placeholder={t('essay.ph.direction')} rows={2} />
              <Field id="essay-problems" label={t('essay.f.problems')} value={draft.future.problems} onChange={(v) => setFuture({ problems: v })} placeholder={t('essay.ph.problems')} rows={2} />
              <Field id="essay-helps" label={t('essay.f.howHelps')} value={draft.future.howHelps} onChange={(v) => setFuture({ howHelps: v })} placeholder={t('essay.ph.howHelps', { name: selectedUni?.shortName || t('essay.theUniversity') })} rows={3} />
            </div>
          )}

          {/* AI feedback on the applicant's own text */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3.5 sm:p-4 space-y-3" aria-label={t('essay.ai.title')}>
            <div className="space-y-3">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <MessageSquareText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" /> {t('essay.ai.title')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-2xl">{t('essay.ai.hint')}</p>
              </div>
              <div className="flex flex-col min-[420px]:flex-row min-[420px]:flex-wrap gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => review(stage)}
                  disabled={Boolean(reviewing) || !canReview(stage)}
                  aria-busy={reviewing === stage}
                  className="ar-btn ar-btn-primary ar-btn-sm min-w-0 max-w-full"
                >
                  {reviewing === stage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquareText className="w-3.5 h-3.5" />}
                  <span className="truncate">{reviewing === stage ? reviewCaption || t('essay.ai.running') : t('essay.ai.stage')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => review('all')}
                  disabled={Boolean(reviewing) || !canReview('all')}
                  aria-busy={reviewing === 'all'}
                  className="ar-btn ar-btn-secondary ar-btn-sm min-w-0 max-w-full"
                >
                  {reviewing === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span className="truncate">{reviewing === 'all' ? reviewCaption || t('essay.ai.running') : t('essay.ai.all')}</span>
                </button>
              </div>
            </div>
            {!canReview(stage) && <p className="text-xs text-slate-500 dark:text-zinc-400">{t('essay.ai.needText')}</p>}
            {reviewError && (
              <p role="alert" className="ar-notice ar-notice-error">
                {reviewError}
              </p>
            )}
            {fb && <FeedbackView fb={fb} t={t} />}
            {fbAll && (
              <details className="group rounded-xl border border-[var(--line)] bg-[var(--surface-raised)]" open={!fb}>
                <summary className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  {t('essay.ai.allTitle')}
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-3 pb-3 pt-1">
                  <FeedbackView fb={fbAll} t={t} />
                </div>
              </details>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
          <button type="button" onClick={handleCopy} className="ar-btn ar-btn-primary">
            {copied === 'ok' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span aria-live="polite">{copied === 'ok' ? t('essay.copied') : copied === 'fail' ? t('essay.copyFailed') : t('essay.copy')}</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setStage(STAGES[index - 1])} disabled={index === 0} className="ar-btn ar-btn-secondary flex-1 sm:flex-none px-3">
              <ArrowLeft className="w-4 h-4" /> {t('essay.back')}
            </button>
            <button type="button" onClick={() => setStage(STAGES[index + 1])} disabled={index === STAGES.length - 1} className="ar-btn ar-btn-secondary flex-1 sm:flex-none px-3">
              {t('essay.next')} <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleClose} className="ar-btn ar-btn-quiet flex-1 sm:flex-none">
              {t('essay.closeAction')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; list?: string; counter?: boolean }> = ({ id, label, value, onChange, placeholder, rows, list, counter }) => {
  const { t } = useI18n();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="ar-label">
        {label}
      </label>
      {rows ? (
        <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="ar-input resize-y leading-relaxed" maxLength={4000} />
      ) : (
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="ar-input" maxLength={300} list={list} />
      )}
      {counter && <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 text-right tabular-nums">{t('essay.words', { n: words(value), c: value.length })}</p>}
    </div>
  );
};

const UniversityFacts: React.FC<{ uni: University; t: (key: string, vars?: Record<string, string | number>) => string }> = ({ uni, t }) => {
  const { tx } = useI18n();
  const rows: [string, string[]][] = [
    [t('essay.facts.programs'), uni.flagshipPrograms],
    [t('essay.facts.projects'), uni.campus?.internalProjects || []],
    [t('essay.facts.labs'), uni.campus?.equipment || []],
    [t('essay.facts.clubs'), uni.campus?.studentClubs || []],
    [t('essay.facts.likes'), uni.admissions?.likes || []],
    [t('essay.facts.prompts'), uni.admissions?.essayPrompts || []],
  ];
  return (
    <div className="px-3 pt-3 pb-3.5 space-y-2.5 text-xs sm:text-[13px] text-slate-600 dark:text-zinc-400 border-t border-[var(--line)]">
      {rows
        .filter(([, list]) => list.length)
        .map(([title, list]) => (
          <div key={title}>
            <p className="font-semibold text-slate-800 dark:text-zinc-200">{title}</p>
            <p className="leading-relaxed">{list.map((x) => tx(x)).join(' · ')}</p>
          </div>
        ))}
      <p className="text-xs text-slate-500 dark:text-zinc-500">{t('essay.facts.note')}</p>
    </div>
  );
};

const ISSUE_TONE: Record<string, string> = {
  cliche: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/25',
  generic: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25',
  no_example: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25',
  no_result: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25',
  no_link: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/25',
  weak_university_link: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/25',
  logic: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25',
  other: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
};

const FB_LABEL = 'text-[11px] uppercase tracking-[0.06em] font-semibold mb-1.5';

const FeedbackView: React.FC<{ fb: EssayFeedback; t: (key: string, vars?: Record<string, string | number>) => string }> = ({ fb, t }) => (
  <div className="space-y-3 text-xs sm:text-[13px] leading-relaxed animate-fadeIn">
    {fb.summary && <p className="text-slate-800 dark:text-zinc-200">{fb.summary}</p>}
    {fb.strengths.length > 0 && (
      <div>
        <p className={`${FB_LABEL} text-emerald-700 dark:text-emerald-400`}>{t('essay.ai.strengths')}</p>
        <ul className="space-y-1 text-slate-700 dark:text-zinc-300">
          {fb.strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-[3px]" /> <span className="min-w-0">{s}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
    {fb.issues.length > 0 && (
      <div>
        <p className={`${FB_LABEL} text-slate-500 dark:text-zinc-400`}>{t('essay.ai.issues')}</p>
        <ul className="space-y-2">
          {fb.issues.map((iss, i) => (
            <li key={i} className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 space-y-1.5">
              <span className={`inline-block px-1.5 py-0.5 rounded-md border text-[11px] font-semibold ${ISSUE_TONE[iss.type] || ISSUE_TONE.other}`}>{t(`essay.issue.${iss.type}`)}</span>
              {iss.quote && (
                <p className="text-slate-500 dark:text-zinc-400 italic flex items-start gap-1.5">
                  <Quote className="w-3 h-3 shrink-0 mt-1" /> <span className="min-w-0">{iss.quote}</span>
                </p>
              )}
              <p className="text-slate-800 dark:text-zinc-200">{iss.comment}</p>
              {iss.suggestion && (
                <p className="text-slate-600 dark:text-zinc-400">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">{t('essay.ai.suggestion')}:</span> {iss.suggestion}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    )}
    {fb.questions.length > 0 && (
      <div>
        <p className={`${FB_LABEL} text-slate-500 dark:text-zinc-400`}>{t('essay.ai.questions')}</p>
        <ul className="space-y-1 text-slate-700 dark:text-zinc-300">
          {fb.questions.map((q, i) => (
            <li key={i} className="flex items-start gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0 mt-[3px]" /> <span className="min-w-0">{q}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
    <p className="text-[11px] text-slate-400 dark:text-zinc-500">{fb.model === 'offline-rules' ? t('essay.ai.offline') : fb.model}</p>
  </div>
);

/** The structure copied to the clipboard: every stage with the applicant's own text, in the interface language. */
function buildOutline(d: EssayDraft, profile: ApplicantProfile, universities: University[], t: (key: string, vars?: Record<string, string | number>) => string) {
  const uni = universities.find((u) => u.id === d.university.universityId);
  const line = (label: string, value: string) => (value.trim() ? `${label}: ${value.trim()}` : '');
  // A stage with nothing written yet still appears in the structure, marked with a dash.
  const section = (title: string, lines: string[]) => [title, ...(lines.some(Boolean) ? lines.filter(Boolean) : ['—'])].join('\n');
  const projects = d.projects
    .filter((p) => Object.values(p).some((v) => v.trim()))
    .map((p, i) =>
      [
        `${t('essay.project', { n: i + 1 })}${p.title.trim() ? ` — ${p.title.trim()}` : ''}`,
        line(`  ${t('essay.f.problem')}`, p.problem),
        line(`  ${t('essay.f.role')}`, p.role),
        line(`  ${t('essay.f.methods')}`, p.methods),
        line(`  ${t('essay.f.result')}`, p.result),
        line(`  ${t('essay.f.skills')}`, p.skills),
        line(`  ${t('essay.f.link')}`, p.link),
      ]
        .filter(Boolean)
        .join('\n'),
    );
  const parts = [
    t('essay.title').toUpperCase(),
    [profile.name && `${t('essay.copy.candidate')}: ${profile.name}`, uni && `${t('essay.f.university')}: ${uni.name}`, d.university.program && `${t('essay.f.program')}: ${d.university.program}`].filter(Boolean).join(' · '),
    section(`1. ${t('essay.stage.hook').toUpperCase()}`, [d.hook.trim()]),
    section(`2. ${t('essay.stage.projects').toUpperCase()}`, projects),
    section(`3. ${t('essay.stage.university').toUpperCase()}${uni ? ` — ${uni.shortName}` : ''}`, [
      line(t('essay.f.whyUniversity'), d.university.whyUniversity),
      line(t('essay.f.whyProgram'), d.university.whyProgram),
      line(t('essay.f.features'), d.university.features),
      line(t('essay.f.opportunities'), d.university.opportunities),
      line(t('essay.f.experienceLink'), d.university.experienceLink),
    ]),
    section(`4. ${t('essay.stage.future').toUpperCase()}`, [
      line(t('essay.f.academic'), d.future.academic),
      line(t('essay.f.professional'), d.future.professional),
      line(t('essay.f.direction'), d.future.direction),
      line(t('essay.f.problems'), d.future.problems),
      line(t('essay.f.howHelps'), d.future.howHelps),
    ]),
  ];
  return parts.filter(Boolean).join('\n\n');
}
