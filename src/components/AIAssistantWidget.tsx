import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, X, Send, User, MessageSquareText, ScanSearch, Loader2, Trash2, ExternalLink, ListPlus, AlertTriangle, Square, ThumbsUp, ThumbsDown, ShieldCheck } from 'lucide-react';
import type { ApplicantProfile, ChatMessage, TaskCategory } from '../types';
import { aiApi, tasksApi, feedbackApi, chatStream, ApiError, type ApplicantAnalysis, type EssayReview } from '../lib/api';
import { useI18n } from '../i18n/I18nContext';
import { useToast } from '../context/ToastContext';
import { UNIVERSITY_DATABASE } from '../data/universities';
import { Markdown } from './ui/Markdown';
import { useProgressCaptions } from '../hooks/useProgressCaptions';

interface AIAssistantWidgetProps {
  profile: ApplicantProfile | null;
  isAuthenticated: boolean;
}

type Tab = 'chat' | 'analyze' | 'essay';

interface UiMessage extends ChatMessage {
  id?: string;
  streaming?: boolean;
  verified?: boolean;
  model?: string;
  feedback?: 'up' | 'down';
  question?: string;
}

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({ profile, isAuthenticated }) => {
  const { t, lang } = useI18n();
  const { notify } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Analysis tab
  const [freeText, setFreeText] = useState('');
  const [analysis, setAnalysis] = useState<ApplicantAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Essay tab
  const [essay, setEssay] = useState('');
  const [essayUni, setEssayUni] = useState('');
  const [essayResult, setEssayResult] = useState<EssayReview | null>(null);
  const [essayLoading, setEssayLoading] = useState(false);
  const [essayError, setEssayError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const analyzeCaption = useProgressCaptions(analyzing, [t('progress.reading'), t('progress.universities'), t('progress.chances'), t('progress.plan'), t('progress.finishing')]);

  const greeting: UiMessage = { role: 'assistant', content: t('ai.greeting') };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, isOpen, tab]);

  // Load status + history once the widget is opened for the first time.
  useEffect(() => {
    if (!isOpen || historyLoaded) return;
    (async () => {
      try {
        const st = await aiApi.status();
        setAiConfigured(st.primary !== 'none');
      } catch {
        setAiConfigured(false);
      }
      try {
        const h = await aiApi.history();
        setMessages(h.messages.length ? h.messages.map((m) => ({ ...m, id: (m as UiMessage).id })) : [greeting]);
      } catch {
        setMessages([greeting]);
      }
      setHistoryLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, historyLoaded]);

  // Reload history when the account changes (guest ↔ user).
  useEffect(() => {
    setHistoryLoaded(false);
    setMessages([]);
  }, [isAuthenticated]);

  const describeError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError) return err.code === 'NETWORK' ? t('common.backendOffline') : err.message;
      return err instanceof Error ? err.message : t('common.error');
    },
    [t],
  );

  const sendMessage = async (userMessage: string) => {
    if (!userMessage || isTyping) return;
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }, { role: 'assistant', content: '', streaming: true, question: userMessage }]);
    setInput('');
    setSuggestions([]);
    setIsTyping(true);
    setStatus(t('ai.status.context'));
    const controller = new AbortController();
    abortRef.current = controller;
    const patchLast = (patch: Partial<UiMessage> | ((m: UiMessage) => UiMessage)) =>
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (!last || last.role !== 'assistant') return prev;
        next[next.length - 1] = typeof patch === 'function' ? patch(last) : { ...last, ...patch };
        return next;
      });
    try {
      await chatStream(
        userMessage,
        profile,
        lang,
        (ev) => {
          switch (ev.type) {
            case 'status':
              setStatus(ev.text === 'context' ? t('ai.status.context') : ev.text === 'thinking' ? t('ai.status.thinking') : ev.text === 'verifying' ? t('ai.status.verifying') : t('ai.status.fallback'));
              break;
            case 'token':
              setStatus(null);
              patchLast((m) => ({ ...m, content: m.content + ev.text }));
              break;
            case 'revision':
              patchLast({ content: ev.text, verified: true });
              break;
            case 'sources':
              patchLast({ sources: ev.items.map((x) => x.url) });
              break;
            case 'done':
              patchLast({ streaming: false, id: ev.messageId || undefined, model: ev.model, sources: ev.sources.map((x) => x.url) });
              setStatus(null);
              break;
            case 'suggestions':
              setSuggestions(ev.items);
              break;
            case 'error':
              patchLast((m) => ({ ...m, streaming: false, content: m.content || `⚠️ ${ev.message}` }));
              break;
          }
        },
        controller.signal,
      );
    } catch (err) {
      patchLast((m) => ({ ...m, streaming: false, content: m.content || `⚠️ ${describeError(err)}` }));
    } finally {
      patchLast((m) => ({ ...m, streaming: false }));
      setIsTyping(false);
      setStatus(null);
      abortRef.current = null;
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input.trim());
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const sendFeedback = async (idx: number, rating: 'up' | 'down') => {
    const m = messages[idx];
    if (!m || m.role !== 'assistant') return;
    setMessages((prev) => prev.map((x, i) => (i === idx ? { ...x, feedback: rating } : x)));
    try {
      await feedbackApi.send({ messageId: m.id || null, rating, question: m.question, answer: m.content });
      notify(t('ai.feedback.thanks'), 'success');
    } catch {
      /* feedback is best-effort */
    }
  };

  const handleClear = async () => {
    try {
      await aiApi.clearHistory();
    } catch {
      /* ignore */
    }
    setMessages([greeting]);
  };

  const runAnalysis = async () => {
    if (!profile) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      setAnalysis(await aiApi.analyze(profile, freeText, lang, 6));
    } catch (err) {
      setAnalysisError(describeError(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const addStepsToTasks = async () => {
    if (!analysis?.nextSteps?.length) return;
    if (!isAuthenticated) {
      notify(t('common.loginRequired'), 'info');
      return;
    }
    try {
      const res = await tasksApi.bulkCreate(
        analysis.nextSteps.map((step) => ({
          title: step.title.slice(0, 200),
          category: (step.category || 'other') as TaskCategory,
          dueDate: /^\d{4}-\d{2}(-\d{2})?/.test(step.deadline) ? step.deadline.slice(0, 10) : null,
          source: 'ai-analysis',
        })),
      );
      notify(`${t('ai.analyze.addTasks')}: ${res.created.length}`, 'success');
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  const runEssayReview = async () => {
    if (essay.trim().length < 80) return;
    setEssayLoading(true);
    setEssayError(null);
    try {
      setEssayResult(await aiApi.essayReview(essay, essayUni || undefined, lang, profile));
    } catch (err) {
      setEssayError(describeError(err));
    } finally {
      setEssayLoading(false);
    }
  };

  const tierClass = (tier: string) =>
    tier === 'Dream'
      ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25'
      : tier === 'Target'
        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/25'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25';

  // Small uppercase label used above blocks of the analysis / essay review.
  const microLabel = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-zinc-400';
  const panel = 'p-3.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--line)]';

  return (
    <>
      {/* Floating launcher (.ar-fab keeps it above the phone tab bar) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`ar-fab fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 dark:bg-blue-500 dark:hover:bg-blue-600 transition-[background-color,box-shadow,opacity] duration-200 animate-fadeInUp ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label={t('ai.title')}
        title={t('ai.title')}
        aria-expanded={isOpen}
      >
        <MessageSquareText className="w-6 h-6" />
      </button>

      {/* Chat window: a floating panel on tablets/desktop, nearly full screen on phones */}
      <div
        role="dialog"
        aria-label={t('ai.title')}
        className={`fixed z-50 inset-2 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[440px] sm:max-w-[calc(100vw-3rem)] sm:h-[640px] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden bg-[var(--surface-raised)] rounded-2xl border border-[var(--line)] shadow-[var(--shadow-overlay)] origin-bottom-right transition-[opacity,transform,visibility] duration-200 ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'invisible opacity-0 translate-y-2 scale-[0.98] pointer-events-none'}`}
      >
        {/* Header */}
        <div className="shrink-0 pl-4 pr-2 py-2.5 border-b border-[var(--line)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="ar-icon-tile">
              <Bot className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight truncate">{t('ai.title')}</h2>
              <p className={`text-xs truncate ${aiConfigured === false ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-zinc-400'}`}>{aiConfigured === false ? t('ai.offline') : t('ai.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {tab === 'chat' && (
              <button type="button" onClick={handleClear} className="ar-btn ar-btn-icon" title={t('ai.clear')} aria-label={t('ai.clear')}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button type="button" onClick={() => setIsOpen(false)} className="ar-btn ar-btn-icon" title={t('common.close')} aria-label={t('common.close')}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 px-3 py-2 border-b border-[var(--line)]">
          <div role="tablist" className="flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-[var(--line)] overflow-x-auto hide-scrollbar">
            {(['chat', 'analyze', 'essay'] as Tab[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`flex-1 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  tab === k ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {t(`ai.tab.${k}`)}
              </button>
            ))}
          </div>
        </div>

        {/* CHAT */}
        {tab === 'chat' && (
          <>
            <div ref={scrollRef} className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto overflow-x-hidden space-y-4 bg-[var(--surface-subtle)]">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      m.role === 'user' ? 'bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
                    }`}
                  >
                    {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div
                    className={`min-w-0 max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-md dark:bg-blue-500'
                        : 'bg-[var(--surface-raised)] border border-[var(--line)] text-slate-800 dark:text-zinc-200 rounded-tl-md shadow-[var(--shadow-card)]'
                    }`}
                  >
                    {m.role === 'user' ? m.content : m.content ? <Markdown text={m.content} compact /> : null}
                    {m.role === 'assistant' && m.streaming && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-1" aria-live="polite">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        {status || t('ai.status.thinking')}
                      </span>
                    )}
                    {m.role === 'assistant' && !m.streaming && m.content && idx > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-[var(--line)] flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                        {m.verified && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400" title={t('ai.verifiedHint')}>
                            <ShieldCheck className="w-3 h-3" /> {t('ai.verified')}
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => sendFeedback(idx, 'up')}
                            aria-pressed={m.feedback === 'up'}
                            className={`p-1.5 rounded-lg transition hover:bg-slate-100 dark:hover:bg-zinc-800 ${m.feedback === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'hover:text-slate-700 dark:hover:text-zinc-200'}`}
                            title={t('ai.feedback.up')}
                            aria-label={t('ai.feedback.up')}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => sendFeedback(idx, 'down')}
                            aria-pressed={m.feedback === 'down'}
                            className={`p-1.5 rounded-lg transition hover:bg-slate-100 dark:hover:bg-zinc-800 ${m.feedback === 'down' ? 'text-rose-600 dark:text-rose-400' : 'hover:text-slate-700 dark:hover:text-zinc-200'}`}
                            title={t('ai.feedback.down')}
                            aria-label={t('ai.feedback.down')}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                    )}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[var(--line)] flex flex-wrap gap-1.5 items-center">
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">{t('ai.sources')}:</span>
                        {m.sources.slice(0, 5).map((s) => {
                          const uni = UNIVERSITY_DATABASE.find(
                            (u) =>
                              u.officialPortalUrl === s ||
                              u.links?.website === s ||
                              (u.links?.admissions && u.links.admissions === s) ||
                              s.toLowerCase().includes(u.id.toLowerCase()),
                          );
                          const label = uni ? uni.shortName || uni.name : s.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                          return (
                            <a
                              key={s}
                              href={s}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 max-w-full text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 dark:hover:bg-blue-500/20 dark:hover:text-blue-200 font-medium transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{label}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

            </div>

            <div className="shrink-0 p-3 bg-[var(--surface-raised)] border-t border-[var(--line)] space-y-2">
              {suggestions.length > 0 && !isTyping && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug) => (
                    <button key={sug} type="button" onClick={() => void sendMessage(sug)} className="ar-chip max-w-full min-h-8 px-3 py-1 text-xs text-left">
                      {sug}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('ai.placeholder')}
                  aria-label={t('ai.placeholder')}
                  className="ar-input flex-1 min-w-0"
                />
                {isTyping ? (
                  <button type="button" onClick={handleStop} className="ar-btn ar-btn-secondary w-11 h-11 p-0 shrink-0" title={t('ai.stop')} aria-label={t('ai.stop')}>
                    <Square className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button type="submit" disabled={!input.trim()} aria-label={t('ai.send')} title={t('ai.send')} className="ar-btn ar-btn-primary w-11 h-11 p-0 shrink-0">
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </form>
            </div>
          </>
        )}

        {/* ANALYZE */}
        {tab === 'analyze' && (
          <div ref={scrollRef} className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto overflow-x-hidden space-y-3 bg-[var(--surface-subtle)] text-xs break-words">
            {!analysis && (
              <>
                <p className="text-[13px] text-slate-600 dark:text-zinc-400 leading-relaxed">{t('ai.analyze.intro')}</p>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder={t('ai.analyze.freeText')}
                  aria-label={t('ai.analyze.freeText')}
                  rows={4}
                  className="ar-input"
                />
                <button type="button" onClick={runAnalysis} disabled={analyzing || !profile} aria-busy={analyzing} className="ar-btn ar-btn-primary w-full">
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> <span className="truncate">{analyzeCaption || t('ai.analyze.running')}</span>
                    </>
                  ) : (
                    <>
                      <ScanSearch className="w-4 h-4" /> {t('ai.analyze.run')}
                    </>
                  )}
                </button>
                {analysisError && (
                  <p role="alert" className="ar-notice ar-notice-error">
                    {analysisError}
                  </p>
                )}
              </>
            )}

            {analysis && (
              <>
                <div className={panel}>
                  <div className={`${microLabel} mb-1.5`}>{t('ai.analyze.summary')}</div>
                  <Markdown text={analysis.summary} compact />
                  <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5">model: {analysis.model}</div>
                </div>

                <div className={`${microLabel} pt-1`}>{t('ai.analyze.ranked')}</div>
                {analysis.ranked.map((r) => (
                  <div key={r.id} className={`${panel} space-y-2`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 text-[13px] font-semibold text-slate-900 dark:text-white">{r.name}</div>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 ${tierClass(r.tier)}`}>{r.tier}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-zinc-400">
                      <span>
                        {t('ai.analyze.fit')}: <strong className="font-semibold text-slate-900 dark:text-white tabular-nums">{r.fitScore}%</strong>
                      </span>
                      <span>
                        {t('ai.analyze.chance')}: <strong className="font-semibold text-slate-900 dark:text-white tabular-nums">{r.chance}%</strong>
                      </span>
                    </div>
                    {r.reasons?.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">{t('ai.analyze.reasons')}</div>
                        <ul className="list-disc pl-4 text-slate-700 dark:text-zinc-300 space-y-0.5 marker:text-slate-400">{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
                      </div>
                    )}
                    {r.risks?.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 mb-0.5">{t('ai.analyze.risks')}</div>
                        <ul className="list-disc pl-4 text-slate-700 dark:text-zinc-300 space-y-0.5 marker:text-slate-400">{r.risks.map((x, i) => <li key={i}>{x}</li>)}</ul>
                      </div>
                    )}
                    {r.healthAndLifestyle && (
                      <div className="text-xs text-slate-600 dark:text-zinc-400 border-t border-[var(--line)] pt-2">
                        <span className="font-semibold text-slate-700 dark:text-zinc-300">{t('ai.analyze.health')}:</span> {r.healthAndLifestyle}
                      </div>
                    )}
                    {r.links?.website && (
                      <a href={r.links.admissions || r.links.website} target="_blank" rel="noreferrer" className="ar-link text-xs">
                        <ExternalLink className="w-3 h-3" /> {t('common.officialPortal')}
                      </a>
                    )}
                  </div>
                ))}

                {analysis.redFlags?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/25">
                    <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-amber-800 dark:text-amber-300 mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> {t('ai.analyze.redFlags')}
                    </div>
                    <ul className="list-disc pl-4 text-amber-900 dark:text-amber-100 space-y-0.5">{analysis.redFlags.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                )}

                {analysis.nextSteps?.length > 0 && (
                  <div className={panel}>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
                      <div className={microLabel}>{t('ai.analyze.nextSteps')}</div>
                      <button type="button" onClick={addStepsToTasks} className="ar-link text-xs">
                        <ListPlus className="w-3.5 h-3.5" /> {t('ai.analyze.addTasks')}
                      </button>
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.nextSteps.map((s, i) => (
                        <li key={i} className="flex items-start justify-between gap-2 text-slate-700 dark:text-zinc-300">
                          <span className="min-w-0">{s.title}</span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 shrink-0 tabular-nums">{s.deadline}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.testStrategy && (
                  <div className={panel}>
                    <div className={`${microLabel} mb-1.5`}>{t('ai.analyze.testStrategy')}</div>
                    <Markdown text={analysis.testStrategy} compact />
                  </div>
                )}

                <button type="button" onClick={() => setAnalysis(null)} className="ar-btn ar-btn-secondary w-full">
                  {t('common.retry')}
                </button>
              </>
            )}
          </div>
        )}

        {/* ESSAY */}
        {tab === 'essay' && (
          <div ref={scrollRef} className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto overflow-x-hidden space-y-3 bg-[var(--surface-subtle)] text-xs break-words">
            <p className="text-[13px] text-slate-600 dark:text-zinc-400 leading-relaxed">{t('ai.essay.intro')}</p>
            <select value={essayUni} onChange={(e) => setEssayUni(e.target.value)} aria-label={t('ai.essay.university')} className="ar-input">
              <option value="">{t('ai.essay.university')}</option>
              {UNIVERSITY_DATABASE.map((u) => (
                <option key={u.id} value={u.id}>{u.shortName} — {u.country}</option>
              ))}
            </select>
            <textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder={t('ai.essay.placeholder')}
              aria-label={t('ai.essay.placeholder')}
              rows={7}
              className="ar-input leading-relaxed"
            />
            <button type="button" onClick={runEssayReview} disabled={essayLoading || essay.trim().length < 80} aria-busy={essayLoading} className="ar-btn ar-btn-primary w-full">
              {essayLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {t('ai.analyze.running')}
                </>
              ) : (
                t('ai.essay.run')
              )}
            </button>
            {essayError && (
              <p role="alert" className="ar-notice ar-notice-error">
                {essayError}
              </p>
            )}
            {essayResult && (
              <div className="space-y-2.5">
                <div className={`${panel} flex items-center justify-between gap-3`}>
                  <span className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">{t('ai.essay.score')}</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{essayResult.score ?? '—'}/10</span>
                </div>
                {essayResult.verdict && <p className="text-[13px] text-slate-700 dark:text-zinc-300 leading-relaxed px-1">{essayResult.verdict}</p>}
                {[
                  ['strengths', 'text-emerald-700 dark:text-emerald-400', essayResult.strengths],
                  ['weaknesses', 'text-rose-700 dark:text-rose-400', essayResult.weaknesses],
                  ['suggestions', 'text-blue-700 dark:text-blue-300', essayResult.suggestions],
                  ['missedStories', 'text-violet-700 dark:text-violet-300', essayResult.missedStories || []],
                  ['redFlags', 'text-amber-700 dark:text-amber-400', essayResult.redFlags || []],
                ].map(([key, cls, items]) =>
                  (items as string[])?.length ? (
                    <div key={key as string} className={panel}>
                      <div className={`text-[11px] uppercase tracking-[0.06em] font-semibold mb-1.5 ${cls}`}>{t(`ai.essay.${key}`)}</div>
                      <ul className="list-disc pl-4 text-slate-700 dark:text-zinc-300 space-y-0.5 marker:text-slate-400">{(items as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul>
                    </div>
                  ) : null,
                )}
                {essayResult.rewriteOpening && (
                  <div className={panel}>
                    <div className={`${microLabel} mb-1.5`}>{t('ai.essay.rewriteOpening')}</div>
                    <p className="text-slate-700 dark:text-zinc-300 leading-relaxed italic">{essayResult.rewriteOpening}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
