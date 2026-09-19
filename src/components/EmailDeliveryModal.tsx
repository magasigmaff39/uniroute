import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { X, Mail, CheckCircle2, AlertCircle, Send, ShieldCheck } from 'lucide-react';
import { sendRoadmapEmail } from '../utils/emailService';
import { mailApi } from '../lib/api';
import { RoadmapStep, University } from '../types';

interface EmailDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  studentName: string;
  readinessScore: number;
  roadmap: RoadmapStep[];
  matchedUnis: University[];
}

export const EmailDeliveryModal: React.FC<EmailDeliveryModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  studentName,
  readinessScore,
  roadmap,
  matchedUnis,
}) => {
  const { t } = useI18n();
  const [email, setEmail] = useState(userEmail || '');
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);

  // Ask the backend whether SMTP is configured so the modal can say so up front instead of failing on send.
  useEffect(() => {
    if (!isOpen) return;
    mailApi.status().then((s) => setMailConfigured(s.configured)).catch(() => setMailConfigured(null));
  }, [isOpen]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const resp = await sendRoadmapEmail({
        toEmail: email,
        studentName,
        readinessScore,
        roadmap,
        matchedUnis,
      });

      if (resp.success) {
        setResult({
          success: true,
          message: `Маршрут успешно отправлен на ${email} через официальный почтовый шлюз Google SMTP (smtp.gmail.com).`
        });
      } else {
        setResult({
          success: false,
          message: resp.error || 'Ошибка отправки через Google SMTP.'
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.message || 'Ошибка соединения со службой Google SMTP'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-delivery-title"
    >
      <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] shadow-[var(--shadow-overlay)] animate-popIn">

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="ar-icon-tile">
              <Mail className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 id="email-delivery-title" className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
                {t('Доставка маршрута через Google SMTP')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {t('Официальный почтовый шлюз Google (smtp.gmail.com:465 SSL)')}
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

        {/* Content */}
        <form onSubmit={handleSend} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">

          {result && (
            <div
              role={result.success ? 'status' : 'alert'}
              className={result.success ? 'ar-notice border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'ar-notice ar-notice-error'}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="min-w-0 break-words">{result.message}</span>
            </div>
          )}

          <div>
            <label className="ar-label" htmlFor="email-delivery-to">
              {t('Адрес получателя (Gmail):')}
            </label>
            <input
              id="email-delivery-to"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@gmail.com"
              autoComplete="email"
              className="ar-input"
            />
          </div>

          {/* Email Contents Preview Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-[var(--line)] text-sm space-y-1.5 text-slate-600 dark:text-zinc-400 leading-relaxed">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-zinc-400 mb-2">
              {t('Содержимое электронного письма:')}
            </span>
            <p>{t('• Полная сводка академического профиля и Индекс готовности (')} {readinessScore}%)</p>
            <p>{t('• Рекомендованные программы и доступные 100% гранты')}</p>
            <p>{t('• Календарная сетка дедлайнов и контрольных сроков подачи')}</p>
            <p>{t('• Первоочередная задача на текущую неделю')}</p>
          </div>

          {mailConfigured === false && (
            <div className="ar-notice border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span className="min-w-0">
                {t('Почтовый шлюз не настроен на сервере. Добавьте GMAIL_USER и GMAIL_APP_PASSWORD в файл .env и перезапустите backend — тогда письма будут доставляться.')}
              </span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="ar-btn ar-btn-primary ar-btn-lg w-full whitespace-normal text-center"
            >
              {loading ? <span className="ar-spinner" aria-hidden /> : <Send className="w-4 h-4" />}
              <span>{t(loading ? 'Отправка через Google SMTP...' : 'Отправить письмо на мой email')}</span>
            </button>
          </div>

          <p className="flex items-start justify-center gap-1.5 text-center text-xs text-slate-500 dark:text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-600 dark:text-emerald-400" />
            <span>{t('Прямое SSL/TLS соединение с официальным сервером smtp.gmail.com')}</span>
          </p>

        </form>

      </div>
    </div>
  );
};
