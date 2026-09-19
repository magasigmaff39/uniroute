import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomDeadline, EssayDraft, PlannerState } from '../types';
import { plannerApi } from '../lib/api';
import { OLYMPIAD_BY_ID } from '../../shared/data/olympiads.js';

const EMPTY: PlannerState = { favoriteOlympiadIds: [], deadlineDone: {}, customDeadlines: [], essay: null };
const storageKey = (userId: string) => `admitroute_planner_${userId}`;

function normalize(p: Partial<PlannerState> | null | undefined): PlannerState {
  return {
    // Olympiads that left the catalogue are dropped so counters never include them.
    favoriteOlympiadIds: Array.isArray(p?.favoriteOlympiadIds) ? p!.favoriteOlympiadIds.filter((id) => OLYMPIAD_BY_ID.has(id)) : [],
    deadlineDone: p?.deadlineDone && typeof p.deadlineDone === 'object' ? p.deadlineDone : {},
    customDeadlines: Array.isArray(p?.customDeadlines) ? p!.customDeadlines : [],
    essay: p?.essay && typeof p.essay === 'object' ? p.essay : null,
  };
}

function readLocal(userId: string): { planner: PlannerState; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { planner: normalize(parsed.planner), savedAt: Number(parsed.savedAt) || 0 };
  } catch {
    return null;
  }
}

export interface Planner {
  planner: PlannerState;
  toggleFavorite: (olympiadId: string) => void;
  setDeadlineDone: (deadlineId: string, done: boolean) => void;
  addCustomDeadline: (deadline: Omit<CustomDeadline, 'id'>) => void;
  removeCustomDeadline: (id: string) => void;
  saveEssay: (draft: EssayDraft) => void;
}

/**
 * The applicant's planner (favourite olympiads, deadline statuses, own dates, essay draft): cached per account
 * in localStorage so it renders instantly, and synced to the server so it follows the applicant across devices.
 */
export function usePlanner(userId: string | undefined): Planner {
  const [planner, setPlanner] = useState<PlannerState>(() => (userId && readLocal(userId)?.planner) || EMPTY);
  // Only local edits are written back; a planner that just arrived from the server is not re-sent.
  const dirty = useRef(false);

  useEffect(() => {
    dirty.current = false;
    if (!userId) {
      setPlanner(EMPTY);
      return;
    }
    const local = readLocal(userId);
    setPlanner(local?.planner || EMPTY);
    let cancelled = false;
    plannerApi
      .get()
      .then((res) => {
        if (cancelled || !res.planner || dirty.current) return;
        if (!local || Date.parse(res.updatedAt || '') > local.savedAt) setPlanner(normalize(res.planner));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !dirty.current) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify({ planner, savedAt: Date.now() }));
    } catch {
      /* quota or private mode — the server copy still works */
    }
    const timer = window.setTimeout(() => {
      plannerApi.save(planner).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [planner, userId]);

  const update = useCallback((fn: (p: PlannerState) => PlannerState) => {
    dirty.current = true;
    setPlanner(fn);
  }, []);

  const toggleFavorite = useCallback(
    (olympiadId: string) =>
      update((p) => ({
        ...p,
        favoriteOlympiadIds: p.favoriteOlympiadIds.includes(olympiadId) ? p.favoriteOlympiadIds.filter((x) => x !== olympiadId) : [...p.favoriteOlympiadIds, olympiadId],
      })),
    [update],
  );

  const setDeadlineDone = useCallback(
    (deadlineId: string, done: boolean) =>
      update((p) => {
        const next = { ...p.deadlineDone };
        if (done) next[deadlineId] = new Date().toISOString().slice(0, 10);
        else delete next[deadlineId];
        return { ...p, deadlineDone: next };
      }),
    [update],
  );

  const addCustomDeadline = useCallback(
    (deadline: Omit<CustomDeadline, 'id'>) =>
      update((p) => ({ ...p, customDeadlines: [...p.customDeadlines, { ...deadline, id: `cd_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` }] })),
    [update],
  );

  const removeCustomDeadline = useCallback(
    (id: string) =>
      update((p) => {
        const deadlineDone = { ...p.deadlineDone };
        delete deadlineDone[`custom:${id}`];
        return { ...p, customDeadlines: p.customDeadlines.filter((d) => d.id !== id), deadlineDone };
      }),
    [update],
  );

  const saveEssay = useCallback((draft: EssayDraft) => update((p) => ({ ...p, essay: { ...draft, updatedAt: new Date().toISOString() } })), [update]);

  return { planner, toggleFavorite, setDeadlineDone, addCustomDeadline, removeCustomDeadline, saveEssay };
}
