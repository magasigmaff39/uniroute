// «Мой профиль» — the applicant's single profile and personal account in one place. Every block shows what
// is known, what is missing and has one «Изменить» button; lists get «+ Добавить».
import React, { useEffect, useRef, useState } from 'react';
import {
  Trophy,
  Pencil,
  ArrowRight,
  ClipboardList,
  ListChecks,
  MessageSquareText,
  CheckCircle2,
  Plus,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ApplicantProfile, NavTarget, PortfolioItem, ProfileBlockId, ProfileFact, UploadedDocument } from '../../types';
import type { UserAccount } from '../../lib/auth';
import { BLOCK_FACTS, BLOCK_ORDER, CORE_FACTS, REQUIRED_FACTS, blockOf, isApprox, type BlockStatus, type Completeness } from '../../utils/profileInsights';
import { UNIVERSITY_BY_ID } from '../../data/universities';
import { useI18n } from '../../i18n/I18nContext';
import { factValue } from '../cabinet/facts';
import { Meter } from '../cabinet/ui';
import { UniversityCrest } from '../ui/UniversityCrest';
import { FactEditor, type Patch } from './fields';
import { PortfolioList } from './PortfolioList';
import { BLOCK_ICONS } from './blockIcons';


/** Facts edited through lists or other pages, not through the block form. */
const LIST_FACTS: ProfileFact[] = ['achievements', 'projects', 'experience', 'documents', 'targetUniversities'];
/** Shown in the block view but not in its form (derived or managed elsewhere). */
const VIEW_ONLY: ProfileFact[] = [];

const STATUS_TONE: Record<BlockStatus, string> = {
  done: 'ar-badge ar-badge-green',
  partial: 'ar-badge ar-badge-amber',
  empty: 'ar-badge',
  optional: 'ar-badge',
};

/** Dashed «+ add» row under a list (entries, universities). */
const ADD_ROW_CLS =
  'w-full min-h-11 px-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:border-blue-300 hover:bg-blue-50/60 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 transition-colors inline-flex items-center justify-center gap-1.5';

interface ProfileSectionProps {
  user: UserAccount;
  profile: ApplicantProfile;
  effectiveProfile: ApplicantProfile;
  completeness: Completeness;
  portfolio: PortfolioItem[];
  documents: UploadedDocument[];
  docsProgress: { required: number; uploadedRequired: number } | null;
  focusBlock?: ProfileBlockId;
  onSave: (patch: Patch) => void;
  onPortfolioChange: (items: PortfolioItem[]) => void;
  onNavigate: (target: NavTarget) => void;
  onAddUniversity: () => void;
  onRemoveUniversity: (id: string) => void;
  onOpenPortfolioAI: () => void;
  onOpenOlympiads: () => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = (props) => {
  const { user, profile, effectiveProfile, completeness, portfolio, documents, docsProgress, focusBlock, onSave, onPortfolioChange, onNavigate, onAddUniversity, onRemoveUniversity, onOpenPortfolioAI, onOpenOlympiads } = props;
  const { t } = useI18n();
  const [editing, setEditing] = useState<ProfileBlockId | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const refs = useRef<Partial<Record<ProfileBlockId, HTMLElement | null>>>({});

  const openBlock = (block: ProfileBlockId) => {
    const hasForm = BLOCK_FACTS[block].some((f) => !LIST_FACTS.includes(f) && !VIEW_ONLY.includes(f));
    if (hasForm) setEditing(block);
    window.setTimeout(() => refs.current[block]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  useEffect(() => {
    if (focusBlock) openBlock(focusBlock);
    // Only on arrival from a link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missing = completeness.missing;

  return (
    <div className="space-y-5 py-2 sm:py-4">
      {/* Who */}
      <div className="flex items-center gap-4">
        {user.photoUrl ? (
          <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-full object-cover shrink-0 border border-[var(--line)]" />
        ) : (
          <span className="w-14 h-14 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200 flex items-center justify-center text-xl font-semibold shrink-0">
            {(profile.firstName || profile.name || user.firstName || '?').slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="ar-kicker mb-1">{t('nav.section.profile')}</p>
          <h1 className="text-2xl sm:text-[28px] leading-tight font-bold text-slate-950 dark:text-white truncate">{profile.name || `${user.firstName} ${user.lastName}`}</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 truncate mt-0.5">{[factValue('grade', profile, t), [profile.city, profile.country].filter(Boolean).join(', '), user.gmail].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      {/* How complete + what to do */}
      <section className="ar-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('pf.completeness', { n: completeness.percent })}</h2>
            <div className="mt-2.5">
              <Meter value={completeness.percent} />
            </div>
          </div>
          {missing.length > 0 && (
            <button type="button" onClick={() => onNavigate({ section: 'profile', flow: 'fill' })} className="ar-btn ar-btn-primary w-full sm:w-auto shrink-0">
              <ListChecks className="w-4 h-4" /> {t('pf.fill')}
            </button>
          )}
        </div>
        {missing.length > 0 ? (
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-2">{t('pf.leftToFill')}</p>
            <div className="flex flex-wrap gap-2">
              {(showMissing ? missing : missing.slice(0, 6)).map((fact) => (
                <button
                  key={fact}
                  type="button"
                  onClick={() => (fact === 'targetUniversities' ? onAddUniversity() : fact === 'documents' ? onNavigate({ section: 'documents' }) : openBlock(blockOf(fact)))}
                  className="ar-chip border-dashed min-h-10 text-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> {t(`fact.${fact}`)}
                  {REQUIRED_FACTS.includes(fact) && <span className="text-rose-500 dark:text-rose-400">*</span>}
                </button>
              ))}
              {!showMissing && missing.length > 6 && (
                <button type="button" onClick={() => setShowMissing(true)} className="ar-btn ar-btn-quiet">
                  {t('pf.moreMissing', { n: missing.length - 6 })}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {t('pf.allFilled')}
          </p>
        )}

        {/* The test is just a way to fill this profile */}
        {!profile.assessmentLevel ? (
          <TestBanner icon={ClipboardList} title={t('pf.test.title')} text={t('pf.test.text')} cta={t('pf.test.cta')} onClick={() => onNavigate({ section: 'profile', flow: 'test' })} />
        ) : profile.assessmentLevel === 'quick' ? (
          <TestBanner icon={ClipboardList} title={t('pf.test.retake.title')} text={t('pf.test.retake.text')} cta={t('pf.test.retake.cta')} onClick={() => onNavigate({ section: 'profile', flow: 'test' })} />
        ) : null}
      </section>

      {/* Blocks: two masonry columns, so a short block never leaves a hole next to a tall one */}
      <div className="columns-1 xl:columns-2 gap-4">
        {BLOCK_ORDER.map((block) => (
          <section key={block} ref={(el) => {
              refs.current[block] = el;
            }} className="ar-card p-4 sm:p-6 scroll-mt-24 break-inside-avoid mb-4">
            <BlockHeader block={block} status={completeness.blocks[block]} onEdit={editing === block || !BLOCK_FACTS[block].some((f) => !LIST_FACTS.includes(f) && !VIEW_ONLY.includes(f)) ? undefined : () => setEditing(block)} />

            {editing === block ? (
              <BlockForm block={block} profile={profile} onSave={onSave} onClose={() => setEditing(null)} />
            ) : (
              <BlockView block={block} effectiveProfile={effectiveProfile} completeness={completeness} />
            )}

            {(block === 'achievements' || block === 'projects' || block === 'experience') && (
              <div className="mt-4">
                <PortfolioList block={block} items={portfolio} onChanged={onPortfolioChange} />
                {block === 'achievements' && (
                  <div className="mt-3 -ml-3 flex flex-wrap gap-x-1 gap-y-1">
                    <button type="button" onClick={onOpenOlympiads} className="ar-btn ar-btn-quiet">
                      <Trophy className="w-4 h-4" /> {t('achievements.catalog')}
                    </button>
                    {portfolio.length > 0 && (
                      <button type="button" onClick={onOpenPortfolioAI} className="ar-btn ar-btn-quiet">
                        <MessageSquareText className="w-4 h-4" /> {t('pf.portfolioAI')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {block === 'admission' && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100">{t('fact.targetUniversities')}</p>
                {(profile.targetUniversityIds || []).map((id) => {
                  const u = UNIVERSITY_BY_ID.get(id);
                  if (!u) return null;
                  const plan = profile.universityPlans?.[id];
                  return (
                    <div key={id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] pl-3 pr-1.5 py-1.5">
                      <UniversityCrest uni={u} size={32} rounded="rounded-lg" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{u.shortName}</span>
                        {(plan?.program || plan?.year) && <span className="block text-xs text-slate-500 dark:text-zinc-400 truncate">{[plan.program, plan.year].filter(Boolean).join(' · ')}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveUniversity(id)}
                        aria-label={t('uni.remove')}
                        className="ar-btn ar-btn-icon shrink-0 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-500/10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                <button type="button" onClick={onAddUniversity} className={ADD_ROW_CLS}>
                  <Plus className="w-4 h-4" /> {t('uni.add.title')}
                </button>
              </div>
            )}

            {block === 'documents' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-zinc-400">
                  {documents.length ? t('pf.docs.count', { n: documents.length }) : t('pf.docs.none')}
                  {docsProgress ? ` · ${t('pf.docs.required', { done: docsProgress.uploadedRequired, total: docsProgress.required })}` : ''}
                </p>
                {documents.length > 0 && (
                  <ul className="space-y-1">
                    {documents.slice(0, 5).map((d) => (
                      <li key={d.id} className="text-sm text-slate-700 dark:text-zinc-200 truncate">
                        · {d.originalName}
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={() => onNavigate({ section: 'documents' })} className="ar-btn ar-btn-secondary">
                  {t('pf.docs.open')} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

const TestBanner: React.FC<{ icon: LucideIcon; title: string; text: string; cta: string; onClick: () => void }> = ({ icon: Icon, title, text, cta, onClick }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 p-4">
    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
      <span className="ar-icon-tile bg-white dark:bg-blue-500/15">
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="block text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">{text}</span>
      </span>
    </div>
    <button type="button" onClick={onClick} className="ar-btn ar-btn-secondary shrink-0">
      {cta} <ArrowRight className="w-4 h-4" />
    </button>
  </div>
);

const BlockHeader: React.FC<{ block: ProfileBlockId; status: BlockStatus; onEdit?: () => void }> = ({ block, status, onEdit }) => {
  const { t } = useI18n();
  const Icon = BLOCK_ICONS[block];
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="ar-icon-tile">
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">{t(`pf.block.${block}`)}</h2>
        <span className={`mt-1 ${STATUS_TONE[status]}`}>{t(`pf.status.${status}`)}</span>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} className="ar-btn ar-btn-secondary ar-btn-sm max-sm:min-h-10 shrink-0">
          <Pencil className="w-4 h-4" /> {t('cabinet.edit')}
        </button>
      )}
    </div>
  );
};

const BlockView: React.FC<{ block: ProfileBlockId; effectiveProfile: ApplicantProfile; completeness: Completeness }> = ({ block, effectiveProfile, completeness }) => {
  const { t } = useI18n();
  const facts = BLOCK_FACTS[block].filter((f) => !LIST_FACTS.includes(f));
  if (!facts.length) return null;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
      {facts.map((fact) => {
        const src = completeness.sources[fact];
        const value = src ? factValue(fact, effectiveProfile, t) : '';
        return (
          <div key={fact} className="min-w-0">
            <dt className="text-xs text-slate-500 dark:text-zinc-400">
              {t(`fact.${fact}`)}
              {REQUIRED_FACTS.includes(fact) && !src && <span className="text-rose-500"> *</span>}
            </dt>
            <dd className={`text-sm mt-0.5 break-words ${value ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500'}`}>
              {value ? (
                <>
                  {isApprox(fact, src) && <span className="text-amber-600 dark:text-amber-400" title={t('cabinet.approx')}>≈ </span>}
                  {value}
                </>
              ) : CORE_FACTS.includes(fact) ? (
                t('cabinet.notSet')
              ) : (
                t('pf.later')
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
};

/**
 * Edit form of one block. Changes stay a draft until «Сохранить»; leaving the block with unsaved changes
 * (another block, another section) saves them too, so nothing typed is lost.
 */
const BlockForm: React.FC<{ block: ProfileBlockId; profile: ApplicantProfile; onSave: (patch: Patch) => void; onClose: () => void }> = ({ block, profile, onSave, onClose }) => {
  const { t } = useI18n();
  const [patch, setPatch] = useState<Patch>({});
  const pending = useRef<Patch>({});
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  });
  useEffect(
    () => () => {
      if (Object.keys(pending.current).length) onSaveRef.current(pending.current);
    },
    [],
  );
  const set = (p: Patch) => {
    setPatch((prev) => {
      const next = { ...prev, ...p };
      pending.current = next;
      return next;
    });
  };
  const value = { ...profile, ...patch };
  const facts = BLOCK_FACTS[block].filter((f) => !LIST_FACTS.includes(f) && !VIEW_ONLY.includes(f));

  const save = () => {
    if (Object.keys(patch).length) onSave(patch);
    pending.current = {};
    onClose();
  };
  const cancel = () => {
    pending.current = {};
    onClose();
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {facts.map((fact) => (
        <FactEditor key={fact} fact={fact} value={value} set={set} />
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={save} className="ar-btn ar-btn-primary px-6">
          {t('pf.save')}
        </button>
        <button type="button" onClick={cancel} className="ar-btn ar-btn-secondary">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
};
