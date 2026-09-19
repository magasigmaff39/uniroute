import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Newspaper,
  ExternalLink,
  Search,
  Calendar,
  Target,
  School,
  GraduationCap,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import type { ApplicantProfile, EducationalNewsItem } from '../types';
import { EDUCATIONAL_NEWS, getRecommendedNews } from '../../shared/data/news/index.js';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ApplicantProfile;
  /** `page` renders inline as the «Новости вузов» cabinet section (no overlay, no close button). */
  variant?: 'modal' | 'page';
}

type NewsTab = 'all' | 'university' | 'college' | 'school' | 'recommended';

export const NewsModal: React.FC<NewsModalProps> = ({ isOpen, onClose, profile, variant = 'modal' }) => {
  const isPage = variant === 'page';
  const { t } = useI18n();
  const [tab, setTab] = useState<NewsTab>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen || isPage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isPage, onClose]);

  // Compute recommended and filtered list
  const recommendedItems = useMemo(() => {
    return getRecommendedNews({
      track: profile.targetTrack,
      grade: profile.grade,
      targetIds: profile.targetUniversityIds,
    });
  }, [profile.targetTrack, profile.grade, profile.targetUniversityIds]);

  const displayedList = useMemo(() => {
    let list: EducationalNewsItem[] = [];

    if (tab === 'recommended') {
      list = recommendedItems;
    } else if (tab === 'all') {
      list = [...(EDUCATIONAL_NEWS as EducationalNewsItem[])];
    } else {
      list = (EDUCATIONAL_NEWS as EducationalNewsItem[]).filter(
        (item) => item.category === tab || item.category === 'all',
      );
    }

    if (selectedTag) {
      list = list.filter((n) => n.tags.includes(selectedTag));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.summary.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.institutionName.toLowerCase().includes(q) ||
          n.tags.some((tg) => tg.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [tab, recommendedItems, selectedTag, searchQuery]);

  // Extract all unique tags for quick filter chips
  const allTags = useMemo(() => {
    const set = new Set<string>();
    (EDUCATIONAL_NEWS as EducationalNewsItem[]).forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).slice(0, 10);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={isPage ? 'py-2 sm:py-4' : 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn'}
      onMouseDown={(e) => {
        if (!isPage && e.target === e.currentTarget) onClose();
      }}
      role={isPage ? undefined : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-label={t('news.title')}
    >
      <div
        className={`relative w-full flex flex-col rounded-2xl bg-[var(--surface-raised)] border border-[var(--line)] overflow-hidden ${
          isPage ? 'shadow-[var(--shadow-card)]' : 'max-w-4xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] shadow-[var(--shadow-overlay)] animate-popIn'
        }`}
      >
        {/* Header (the page variant gets its title from the section header) */}
        <div className={`px-4 sm:px-6 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0 ${isPage ? 'hidden' : ''}`}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="ar-icon-tile">
              <Newspaper className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight sm:truncate">
                {t('news.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                {t('news.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ar-btn ar-btn-icon shrink-0"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-[var(--line)] space-y-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1 py-0.5">
            {[
              { id: 'recommended', label: t('news.tab.recommended'), icon: Target },
              { id: 'all', label: t('news.tab.all'), icon: Newspaper },
              { id: 'university', label: t('news.tab.university'), icon: Building2 },
              { id: 'college', label: t('news.tab.college'), icon: GraduationCap },
              { id: 'school', label: t('news.tab.school'), icon: School },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id as NewsTab);
                    setSelectedTag(null);
                  }}
                  aria-pressed={active}
                  className="ar-chip shrink-0 whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search and Tags */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('news.searchPlaceholder')}
                aria-label={t('news.searchPlaceholder')}
                className="ar-input min-h-10 py-2 pl-9 pr-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-zinc-800"
                  aria-label={t('profile.targets.clear')}
                  title={t('profile.targets.clear')}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tags quick selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full min-w-0 hide-scrollbar py-0.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  aria-pressed={selectedTag === tag}
                  className="ar-chip shrink-0 whitespace-nowrap min-h-8 px-2.5 py-1 text-xs"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Personalized Hint Banner if on Recommended tab */}
        {tab === 'recommended' && (
          <div className="px-4 sm:px-6 py-2.5 bg-blue-50/60 border-b border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 text-xs text-blue-800 dark:text-blue-200 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-300" />
              <span className="min-w-0">
                {t('news.badge.recommended')} · {profile.grade ? t(`auth.grade.${profile.grade.replace('grade_', '')}`) || profile.grade : ''} · {profile.targetTrack ? t(`profile.track.${profile.targetTrack}`) : t('category.all')}
              </span>
            </div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0">
              {t('news.count', { n: displayedList.length })}
            </span>
          </div>
        )}

        {/* News List Content */}
        <div className={`p-4 sm:p-6 space-y-3 flex-1 ${isPage ? '' : 'min-h-0 overflow-y-auto'}`}>
          {displayedList.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center gap-3">
              <span className="ar-icon-tile w-12 h-12 rounded-2xl">
                <Newspaper className="w-6 h-6" />
              </span>
              <p className="text-sm text-slate-500 dark:text-zinc-400">{t('news.empty')}</p>
            </div>
          ) : (
            displayedList.map((item) => {
              const isExpanded = expandedId === item.id;
              const isRecommended = recommendedItems.slice(0, 5).some((r) => r.id === item.id);

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border bg-[var(--surface-raised)] transition-colors duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-blue-200 dark:border-blue-500/30'
                      : 'border-[var(--line)] hover:border-[var(--line-strong)]'
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    {/* Top meta */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        {item.badge && (
                          <span className="ar-badge ar-badge-rose">
                            {item.badge}
                          </span>
                        )}
                        {isRecommended && (
                          <span className="ar-badge ar-badge-blue">
                            <Target className="w-3 h-3" />
                            {t('news.badge.recommended')}
                          </span>
                        )}
                        <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                          {item.institutionName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.date}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug mb-1.5 break-words">
                      {item.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                      {item.summary}
                    </p>

                    {/* Expanded full details */}
                    {isExpanded && (
                      <div className="mt-3.5 pt-3.5 border-t border-[var(--line)] space-y-3 text-sm text-slate-700 dark:text-zinc-300 animate-fadeIn">
                        <p className="leading-relaxed whitespace-pre-line">{item.content}</p>

                        {item.sourceTitle && (
                          <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>Проверенный первоисточник: {item.sourceTitle}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        {item.tags.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                            aria-pressed={selectedTag === t}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs transition-colors ${
                              selectedTag === t
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white'
                            }`}
                          >
                            #{t}
                          </button>
                        ))}
                      </div>

                      {/* Buttons */}
                      <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          aria-expanded={isExpanded}
                          className="ar-btn ar-btn-quiet ar-btn-sm"
                        >
                          {isExpanded ? t('common.hide') : t('common.details')}
                        </button>

                        {/* Direct link to original official website / announcement */}
                        <a
                          href={item.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ar-btn ar-btn-primary ar-btn-sm"
                          title={item.originalUrl}
                        >
                          <span>{t('news.originalSource')}</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
