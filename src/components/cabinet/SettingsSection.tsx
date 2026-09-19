import React from 'react';
import { Sun, Moon, LogOut, RotateCcw, ClipboardList, SlidersHorizontal, UserRound } from 'lucide-react';
import type { ApplicantProfile, AdvisorTone } from '../../types';
import type { UserAccount } from '../../lib/auth';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../context/ThemeContext';
import { Chips } from '../profile/fields';
import { SectionHeader } from './ui';

interface SettingsSectionProps {
  user: UserAccount;
  profile: ApplicantProfile;
  onSave: (patch: Partial<ApplicantProfile>) => void;
  onRetakeTest: () => void;
  onReset: () => void;
  onLogout: () => void;
}

/** One setting: the title (and a hint) above its control, so a card has no empty column on the right. */
const Row: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="py-4 space-y-2.5">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      {hint && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed [overflow-wrap:anywhere]">{hint}</p>}
    </div>
    {children}
  </div>
);

const Card: React.FC<{ icon: React.FC<{ className?: string }>; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <section className="ar-card px-4 sm:px-6 pt-5 pb-1 min-w-0">
    <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2.5 mb-1">
      <span className="ar-icon-tile w-8 h-8">
        <Icon className="w-4 h-4" />
      </span>
      {title}
    </h2>
    <div className="divide-y divide-slate-100 dark:divide-zinc-800">{children}</div>
  </section>
);

/** «Настройки»: everything that is not information about the applicant. */
export const SettingsSection: React.FC<SettingsSectionProps> = ({ user, profile, onSave, onRetakeTest, onReset, onLogout }) => {
  const { t, lang, setLang, languages } = useI18n();
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="space-y-5 py-2 sm:py-4">
      <SectionHeader kicker={t('nav.section.settings')} title={t('settings.title')} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card icon={SlidersHorizontal} title={t('settings.group.interface')}>
          <Row title={t('header.language')}>
            <Chips options={languages.map((l) => l.code)} value={lang} onChange={setLang} label={(c) => languages.find((l) => l.code === c)!.native} />
          </Row>
          <Row title={t('settings.theme')}>
            <div className="flex flex-wrap gap-2">
              {(['light', 'dark'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={theme === m}
                  onClick={() => theme !== m && toggleTheme()}
                  className="ar-chip min-h-10 text-sm"
                >
                  {m === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {t(`settings.theme.${m}`)}
                </button>
              ))}
            </div>
          </Row>
          <Row title={t('settings.tone')} hint={t('settings.tone.hint')}>
            <Chips options={['strategic', 'academic', 'supportive'] as const} value={profile.advisorTone} onChange={(x: AdvisorTone) => onSave({ advisorTone: x })} label={(x) => t(`settings.tone.${x}`)} />
          </Row>
        </Card>

        <Card icon={UserRound} title={t('settings.group.account')}>
          <Row title={t('settings.quick')} hint={t('settings.quick.hint')}>
            <button type="button" onClick={onRetakeTest} className="ar-btn ar-btn-secondary">
              <ClipboardList className="w-4 h-4" /> {t('settings.quick.cta')}
            </button>
          </Row>
          <Row title={t('settings.account')} hint={user.gmail}>
            <button type="button" onClick={onLogout} className="ar-btn ar-btn-secondary">
              <LogOut className="w-4 h-4" /> {t('header.logout')}
            </button>
          </Row>
          <Row title={t('settings.reset')} hint={t('settings.reset.hint')}>
            <button type="button" onClick={onReset} className="ar-btn ar-btn-danger">
              <RotateCcw className="w-4 h-4" /> {t('header.reset')}
            </button>
          </Row>
        </Card>
      </div>
    </div>
  );
};
