import React, { useMemo, useState } from 'react';
import {
  Globe, Send, ExternalLink, ShieldCheck, FlaskConical, Home, Rocket, Users,
  ThumbsUp, ThumbsDown, AlertTriangle, CloudSun, Utensils, Languages as LanguagesIcon, BarChart3, Target,
  Newspaper, Share2, Loader2, BookOpen, Wind, Briefcase,
} from 'lucide-react';
import type { ApplicantProfile, University } from '../types';
import { estimateWithProjections } from '../../shared/logic/chance.js';
import { universitiesApi, aiApi, ApiError, type NewsAnalysis, type SocialAnalysis } from '../lib/api';
import { useI18n } from '../i18n/I18nContext';

interface UniversityDetailsProps {
  uni: University;
  profile: ApplicantProfile;
}

const Instagram = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Youtube = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const Linkedin = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12.5 2h3.1c.2 1.7 1.2 3.3 2.7 4.1.8.5 1.7.7 2.7.7v3.1c-1.9 0-3.7-.6-5.2-1.6v7.2A6.5 6.5 0 1 1 9.3 9v3.2a3.4 3.4 0 1 0 3.2 3.4V2z" />
  </svg>
);

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] space-y-2 min-w-0">
    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300">
      <span className="text-slate-500 dark:text-zinc-400 shrink-0">{icon}</span>
      {title}
    </div>
    <div className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">{children}</div>
  </div>
);

const Chips: React.FC<{ items: string[]; tone?: 'neutral' | 'good' | 'bad' | 'warn' }> = ({ items, tone = 'neutral' }) => {
  const { tx } = useI18n();
  const cls =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/25'
      : tone === 'bad'
        ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/25'
        : tone === 'warn'
          ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/25'
          : 'bg-white text-slate-700 border-slate-200 dark:text-zinc-300';
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x, i) => (
        <span key={i} className={`px-2 py-0.5 rounded-md text-xs leading-5 border ${cls}`}>{tx(x)}</span>
      ))}
    </div>
  );
};

const microLabel = 'text-[11px] uppercase tracking-[0.06em] font-semibold text-slate-500 dark:text-zinc-400';
const textLink = 'text-blue-700 dark:text-blue-300 hover:underline underline-offset-2';

export const UniversityDetails: React.FC<UniversityDetailsProps> = ({ uni, profile }) => {
  const { t, tx, lang } = useI18n();
  const [news, setNews] = useState<NewsAnalysis | null>(null);
  const [social, setSocial] = useState<SocialAnalysis | null>(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [translated, setTranslated] = useState<{ description: string; whyItFits: string; advantages: string[]; cautions: string[] } | null>(null);
  const [translating, setTranslating] = useState(false);

  const estimate = useMemo(() => estimateWithProjections(profile, uni), [profile, uni]);

  const describeError = (e: unknown) => (e instanceof ApiError ? (e.code === 'NETWORK' ? t('common.backendOffline') : e.message) : t('common.error'));

  const loadNews = async () => {
    setLoadingNews(true);
    setErr(null);
    try {
      setNews(await universitiesApi.newsAnalysis(uni.id, lang));
    } catch (e) {
      setErr(describeError(e));
    } finally {
      setLoadingNews(false);
    }
  };

  const loadSocial = async () => {
    setLoadingSocial(true);
    setErr(null);
    try {
      setSocial(await universitiesApi.socialAnalysis(uni.id, lang));
    } catch (e) {
      setErr(describeError(e));
    } finally {
      setLoadingSocial(false);
    }
  };

  const translateTexts = async () => {
    setTranslating(true);
    try {
      const texts = [uni.description, uni.whyItFits, ...uni.advantages, ...uni.cautions];
      const res = await aiApi.translate(texts, lang);
      const items = res.items;
      setTranslated({
        description: items[0],
        whyItFits: items[1],
        advantages: items.slice(2, 2 + uni.advantages.length),
        cautions: items.slice(2 + uni.advantages.length),
      });
    } catch (e) {
      setErr(describeError(e));
    } finally {
      setTranslating(false);
    }
  };

  const links = uni.links;
  const safety = uni.campus?.neighborhoodSafety ?? 0;
  const safetyTone = safety >= 8 ? 'bg-emerald-500' : safety >= 6 ? 'bg-amber-500' : 'bg-rose-500';
  const probTone = estimate.probability >= 60 ? 'text-emerald-700 dark:text-emerald-300' : estimate.probability >= 30 ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-zinc-200';

  return (
    <div className="px-5 sm:px-6 pb-6 pt-5 space-y-3 animate-fadeIn border-t border-[var(--line)]">
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        <span className="ar-badge ar-badge-blue">
          {uni.category === 'school' ? t('category.school') : uni.category === 'college' ? t('category.college') : t('category.university')}
        </span>
        {uni.gradeLevel && (
          <span className="ar-badge whitespace-normal">
            {uni.gradeLevel}
          </span>
        )}
      </div>

      {/* Translated description (kk/en) */}
      {lang !== 'ru' && (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
          <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed flex-1 min-w-0">{translated?.description || tx(uni.description)}</p>
          {!translated && (
            <button type="button" onClick={translateTexts} disabled={translating} aria-busy={translating} className="ar-link shrink-0 self-start min-h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline">
              {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LanguagesIcon className="w-3.5 h-3.5" />}
              {translating ? t('uni.translating') : t('uni.translate')}
            </button>
          )}
        </div>
      )}
      {translated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Chips items={translated.advantages} tone="good" />
          <Chips items={translated.cautions} tone="warn" />
        </div>
      )}

      {/* Links */}
      {links && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 mr-1">{t('uni.links')}:</span>
          {[
            [links.website, Globe, 'Website'],
            [links.admissions, ExternalLink, 'Admissions'],
            [links.instagram, Instagram, 'Instagram'],
            [links.tiktok, TikTokIcon, 'TikTok'],
            [links.youtube, Youtube, 'YouTube'],
            [links.telegram, Send, 'Telegram'],
            [links.linkedin, Linkedin, 'LinkedIn'],
          ]
            .filter(([href]) => Boolean(href))
            .map(([href, Icon, label]) => {
              const I = Icon as React.FC<{ className?: string }>;
              return (
                <a
                  key={label as string}
                  href={href as string}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-8 px-2.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface-raised)] text-xs font-medium text-slate-700 dark:text-zinc-300 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:hover:border-zinc-600 dark:hover:text-white transition"
                >
                  <I className="w-3.5 h-3.5" />
                  {label as string}
                </a>
              );
            })}
        </div>
      )}

      {/* Chance + safety + test policy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--line)] space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300"><Target className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" /> {t('uni.chance')}</span>
            <span className={`text-xl font-bold tabular-nums ${probTone}`}>{estimate.probability}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-[width] duration-500" style={{ width: `${estimate.probability}%` }} />
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white">{t('uni.chanceFactors')} ({estimate.factors.length})</summary>
            <ul className="mt-1.5 space-y-1">
              {estimate.factors.map((f, i) => (
                <li key={i} className="flex items-start justify-between gap-2">
                  <span className="text-slate-700 dark:text-zinc-300">{f.note}</span>
                  <span className={`tabular-nums font-semibold shrink-0 ${f.impact >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{f.impact > 0 ? '+' : ''}{f.impact}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--line)] space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300"><ShieldCheck className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" /> {t('uni.safety')}</span>
            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{safety}/10</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div className={`${safetyTone} h-full rounded-full`} style={{ width: `${safety * 10}%` }} />
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">{tx(uni.campus?.neighborhoodNotes)}</p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--line)] space-y-2 min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300"><BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" /> {t('uni.testPolicy')}</span>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{t(`uni.testPolicy.${uni.admissions?.testPolicy || 'optional'}`)}</div>
          {uni.stats && (
            <div className="text-xs text-slate-600 dark:text-zinc-400 space-y-0.5">
              {uni.stats.avgSat && <div>SAT: {uni.stats.avgSat}</div>}
              {uni.stats.internationalShare && (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" /> {uni.stats.internationalShare}
                </div>
              )}
              {uni.stats.studentFacultyRatio && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" /> {uni.stats.studentFacultyRatio}
                </div>
              )}
              {uni.stats.graduateEmployment && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" /> {uni.stats.graduateEmployment}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Projections & prep plan when tests are missing */}
      {(estimate.projections || estimate.prepPlan) && (
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 space-y-3">
          {estimate.projections && (
            <div>
              <div className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1.5">{t('uni.projections')}</div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {Object.entries(estimate.projections).map(([key, arr]) =>
                  (arr as { score: number; probability: number }[]).map((p) => (
                    <span key={`${key}-${p.score}`} className="px-2 py-1 rounded-lg bg-white border border-blue-100 dark:border-blue-500/20 text-slate-800 dark:text-zinc-200 tabular-nums">
                      {key === 'ifIelts' ? 'IELTS' : key === 'ifSat' ? 'SAT' : 'ЕНТ'} {p.score} → <strong className="font-semibold">{p.probability}%</strong>
                    </span>
                  )),
                )}
              </div>
            </div>
          )}
          {estimate.prepPlan && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {estimate.prepPlan.map((plan) => (
                <details key={plan.exam} className="p-3 rounded-lg bg-white border border-blue-100 dark:border-blue-500/20 text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-900 dark:text-white">
                    {t('uni.prepPlan')}: {plan.exam} → {plan.targetScore} · {plan.weeks} {t('common.week')} · {plan.hoursPerWeek} {t('common.hoursPerWeek')}
                  </summary>
                  <ul className="list-disc pl-4 mt-1.5 space-y-0.5 text-slate-700 dark:text-zinc-300 marker:text-slate-400">
                    {plan.milestones.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {plan.resources.map((r) => (
                      <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className={`${textLink} inline-flex items-center gap-1`}><ExternalLink className="w-3 h-3" />{r.title}</a>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campus */}
      {uni.campus && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Section icon={<FlaskConical className="w-3.5 h-3.5" />} title={t('uni.equipment')}><Chips items={uni.campus.equipment} /></Section>
          <Section icon={<Rocket className="w-3.5 h-3.5" />} title={t('uni.projects')}><Chips items={uni.campus.internalProjects} /></Section>
          <Section icon={<Home className="w-3.5 h-3.5" />} title={t('uni.dorms')}>{tx(uni.campus.dormitories)}</Section>
          <Section icon={<Users className="w-3.5 h-3.5" />} title={t('uni.clubs')}><Chips items={uni.campus.studentClubs} /></Section>
        </div>
      )}

      {/* Admissions insight */}
      {uni.admissions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Section icon={<ThumbsUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />} title={t('uni.likes')}><Chips items={uni.admissions.likes} tone="good" /></Section>
          <Section icon={<ThumbsDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />} title={t('uni.dislikes')}>{uni.admissions.dislikes.length ? <Chips items={uni.admissions.dislikes} tone="bad" /> : <span className="text-slate-400">—</span>}</Section>
          <Section icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />} title={t('uni.pitfalls')}><Chips items={uni.admissions.commonPitfalls} tone="warn" /></Section>
        </div>
      )}

      {/* Environment */}
      {uni.environment && (
        <Section icon={<CloudSun className="w-3.5 h-3.5" />} title={t('uni.environment')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            <div><span className="font-semibold">{t('uni.climate')}:</span> {tx(uni.environment.climate)}</div>
            <div className="flex items-start gap-1.5"><Wind className="w-3.5 h-3.5 mt-1 text-slate-400 shrink-0" /><span><span className="font-semibold">{t('uni.air')}:</span> {uni.environment.airQuality}</span></div>
            <div className="sm:col-span-2"><span className="font-semibold">{t('uni.allergy')}:</span> {tx(uni.environment.allergyNotes)}</div>
            <div className="flex items-start gap-1.5"><Utensils className="w-3.5 h-3.5 mt-1 text-slate-400 shrink-0" /><span><span className="font-semibold">{t('uni.food')}:</span> {uni.environment.foodOptions.join(', ')}</span></div>
            <div className="flex items-start gap-1.5"><LanguagesIcon className="w-3.5 h-3.5 mt-1 text-slate-400 shrink-0" /><span><span className="font-semibold">{t('uni.languages')}:</span> {uni.environment.languagesOfInstruction.join(', ')}</span></div>
          </div>
        </Section>
      )}

      {/* AI analyses */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" onClick={loadNews} disabled={loadingNews} aria-busy={loadingNews} className="ar-btn ar-btn-secondary ar-btn-sm">
          {loadingNews ? <Loader2 className="w-4 h-4 animate-spin" /> : <Newspaper className="w-4 h-4" />}
          {loadingNews ? t('uni.analyzing') : t('uni.newsAnalysis')}
        </button>
        <button type="button" onClick={loadSocial} disabled={loadingSocial} aria-busy={loadingSocial} className="ar-btn ar-btn-secondary ar-btn-sm">
          {loadingSocial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          {loadingSocial ? t('uni.analyzing') : t('uni.socialAnalysis')}
        </button>
        {err && <span role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-300 self-center">{err}</span>}
      </div>

      {news && (
        <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--line)] space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white"><Newspaper className="w-4 h-4 text-slate-500 dark:text-zinc-400" /> {t('uni.newsAnalysis')}</span>
            <span className={`ar-badge ${news.sentiment === 'positive' ? 'ar-badge-green' : news.sentiment === 'negative' ? 'ar-badge-rose' : ''}`}>{news.sentiment || 'neutral'}</span>
          </div>
          <p className="text-slate-700 dark:text-zinc-300 leading-relaxed">{news.summary}</p>
          {news.implications && news.implications.length > 0 && (
            <div>
              <div className={`${microLabel} mb-1`}>{t('uni.implications')}</div>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-zinc-300 marker:text-slate-400">{news.implications.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {news.headlines?.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white">{t('uni.headlines')} ({news.headlines.length})</summary>
              <ul className="mt-1.5 space-y-1">
                {news.headlines.slice(0, 8).map((h, i) => (
                  <li key={i}>
                    <a href={h.link} target="_blank" rel="noreferrer" className={textLink}>{h.title}</a>
                    <span className="text-slate-400"> · {h.source} · {h.pubDate?.slice(5, 16)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="text-[11px] text-slate-400 dark:text-zinc-500">model: {news.model}</div>
        </div>
      )}

      {social && (
        <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--line)] space-y-2.5 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white"><Share2 className="w-4 h-4 text-slate-500 dark:text-zinc-400" /> {t('uni.socialAnalysis')}</span>
          {social.summary && <p className="text-slate-700 dark:text-zinc-300 leading-relaxed">{social.summary}</p>}
          {social.presence && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['instagram', 'tiktok', 'youtube'] as const).map((p) => (
                <div key={p} className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] text-xs">
                  <div className={microLabel}>{p}</div>
                  <div className="text-slate-700 dark:text-zinc-300 mt-0.5">{social.presence?.[p] || '—'}</div>
                </div>
              ))}
            </div>
          )}
          {social.whatTheyHighlight && social.whatTheyHighlight.length > 0 && <Chips items={social.whatTheyHighlight} />}
          {social.signals?.platforms?.some((p) => p.platform === 'youtube' && p.recentVideos?.length) && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white">YouTube</summary>
              <ul className="mt-1.5 space-y-1">
                {social.signals.platforms.find((p) => p.platform === 'youtube')!.recentVideos!.slice(0, 5).map((v) => (
                  <li key={v.link}><a href={v.link} target="_blank" rel="noreferrer" className={textLink}>{v.title}</a> <span className="text-slate-400">· {v.published?.slice(0, 10)} · {v.views.toLocaleString()} views</span></li>
                ))}
              </ul>
            </details>
          )}
          {social.verdict && <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] text-slate-800 dark:text-zinc-200"><span className="font-semibold">{t('uni.verdict')}:</span> {social.verdict}</div>}
          <div className="text-[11px] text-slate-400 dark:text-zinc-500">model: {social.model} · {social.signals?.note}</div>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500">
        <BarChart3 className="w-3 h-3" />
        {uni.worldRank} {uni.founded ? `· ${uni.founded}` : ''} {uni.type ? `· ${uni.type}` : ''}
      </div>
    </div>
  );
};
