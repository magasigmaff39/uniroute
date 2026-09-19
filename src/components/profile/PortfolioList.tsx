// Achievements, projects and experience inside the profile: add / edit / delete entries in place. The
// entries are the portfolio itself, so the AI evaluation, documents and analyses all see the same list.
import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { PortfolioItem, PortfolioItemInput, PortfolioItemType, PortfolioLevel, PortfolioResult } from '../../types';
import { portfolioApi, ApiError } from '../../lib/api';
import { BLOCK_ITEM_TYPES } from '../../utils/profileInsights';
import { PORTFOLIO_ITEM_TYPES, PORTFOLIO_LEVELS, PORTFOLIO_RESULTS } from '../../../shared/data/portfolioRubrics.js';
import { useI18n } from '../../i18n/I18nContext';
import { useToast } from '../../context/ToastContext';
import { Chips, Field, TextInput } from './fields';

type ListBlock = keyof typeof BLOCK_ITEM_TYPES;

const WITH_LEVEL: PortfolioItemType[] = ['olympiad', 'competition', 'sport', 'art', 'research'];
const WITH_RESULT: PortfolioItemType[] = ['olympiad', 'competition', 'sport'];
const WITH_ROLE: PortfolioItemType[] = ['leadership', 'project', 'volunteering', 'internship', 'research'];

const blank = (type: PortfolioItemType): PortfolioItemInput => ({ title: '', type, level: null, result: null, role: '', description: '', startDate: null });

export const PortfolioList: React.FC<{ block: ListBlock; items: PortfolioItem[]; onChanged: (items: PortfolioItem[]) => void }> = ({ block, items, onChanged }) => {
  const { t } = useI18n();
  const { notify } = useToast();
  const types = BLOCK_ITEM_TYPES[block];
  const mine = items.filter((it) => types.includes(it.type));
  const [form, setForm] = useState<PortfolioItemInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const label = (list: { id: string; label: string }[], id?: string | null) => (id ? t(list.find((x) => x.id === id)?.label || id) : '');
  const errorText = (err: unknown) => (err instanceof ApiError ? (err.code === 'NETWORK' ? t('common.backendOffline') : err.message) : t('common.error'));

  const refresh = async () => onChanged((await portfolioApi.list()).items);

  const save = async () => {
    if (!form?.title.trim()) return;
    setBusy(true);
    try {
      if (editingId) await portfolioApi.update(editingId, form);
      else await portfolioApi.create(form);
      await refresh();
      setForm(null);
      setEditingId(null);
      notify(t('pf.saved'), 'success');
    } catch (err) {
      notify(errorText(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (it: PortfolioItem) => {
    if (!window.confirm(t('pf.list.confirmDelete', { title: it.title }))) return;
    try {
      await portfolioApi.remove(it.id);
      await refresh();
      notify(t('pf.deleted'), 'success');
    } catch (err) {
      notify(errorText(err), 'error');
    }
  };

  const edit = (it: PortfolioItem) => {
    setEditingId(it.id);
    setForm({ title: it.title, type: it.type, level: it.level, result: it.result, role: it.role, description: it.description, startDate: it.startDate });
  };

  const type = form?.type || types[0];

  return (
    <div className="space-y-2.5">
      {mine.length === 0 && !form && <p className="text-sm text-slate-500 dark:text-zinc-400">{t(`pf.list.empty.${block}`)}</p>}

      {mine.map((it) =>
        editingId === it.id ? null : (
          <div key={it.id} className={`flex items-start gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] pl-3.5 pr-1.5 py-1.5 ${it.excluded ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-0 py-1.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-white break-words">{it.title}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 break-words">
                {[label(PORTFOLIO_ITEM_TYPES, it.type), label(PORTFOLIO_LEVELS, it.level), it.result && it.result !== 'none' ? label(PORTFOLIO_RESULTS, it.result) : '', it.role, it.startDate?.slice(0, 4)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button type="button" onClick={() => edit(it)} aria-label={t('cabinet.edit')} className="ar-btn ar-btn-icon shrink-0">
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => remove(it)}
              aria-label={t('pf.remove')}
              className="ar-btn ar-btn-icon shrink-0 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      )}

      {form ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 p-4 space-y-4 animate-fadeIn">
          {types.length > 1 && (
            <Field label={t('pf.list.type')}>
              <Chips options={types} value={type} onChange={(x: PortfolioItemType) => setForm({ ...form, type: x })} label={(x) => label(PORTFOLIO_ITEM_TYPES, x)} />
            </Field>
          )}
          <Field label={t('pf.list.title')}>
            <TextInput value={form.title} onChange={(x) => setForm({ ...form, title: x })} placeholder={t(`pf.list.titlePh.${block}`)} />
          </Field>
          {WITH_LEVEL.includes(type) && (
            <Field label={t('pf.list.level')} optional>
              <Chips options={PORTFOLIO_LEVELS.map((l) => l.id)} value={form.level || undefined} onChange={(x: PortfolioLevel) => setForm({ ...form, level: x })} label={(x) => label(PORTFOLIO_LEVELS, x)} />
            </Field>
          )}
          {WITH_RESULT.includes(type) && (
            <Field label={t('pf.list.result')} optional>
              <Chips
                options={PORTFOLIO_RESULTS.filter((r) => r.id !== 'none').map((r) => r.id)}
                value={form.result || undefined}
                onChange={(x: PortfolioResult) => setForm({ ...form, result: x })}
                label={(x) => label(PORTFOLIO_RESULTS, x)}
              />
            </Field>
          )}
          {WITH_ROLE.includes(type) && (
            <Field label={t('pf.list.role')} optional>
              <TextInput value={form.role || ''} onChange={(x) => setForm({ ...form, role: x })} placeholder={t('pf.list.rolePh')} />
            </Field>
          )}
          <Field label={t('pf.list.year')} optional>
            <TextInput type="number" min={2015} max={2030} value={form.startDate?.slice(0, 4) || ''} onChange={(x) => setForm({ ...form, startDate: x ? `${x}-01-01` : null })} placeholder="2026" />
          </Field>
          <Field label={t('pf.list.description')} optional>
            <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder={t('pf.list.descriptionPh')} className="ar-input" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={busy || !form.title.trim()} aria-busy={busy} className="ar-btn ar-btn-primary">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t('pf.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setEditingId(null);
              }}
              className="ar-btn ar-btn-secondary"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setForm(blank(types[0]))}
          className="w-full min-h-11 px-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:border-blue-300 hover:bg-blue-50/60 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> {t(`pf.list.add.${block}`)}
        </button>
      )}
    </div>
  );
};
