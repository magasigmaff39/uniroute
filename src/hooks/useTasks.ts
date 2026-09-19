import { useCallback, useEffect, useState } from 'react';
import type { ApplicantProfile, UserTask } from '../types';
import { tasksApi, type NewTask, type TaskLinks, type TaskStats } from '../lib/api';

export interface TasksStore {
  tasks: UserTask[];
  stats: TaskStats | null;
  loading: boolean;
  /** Last load error (the caller decides how to describe it) */
  error: unknown;
  reload: () => Promise<void>;
  create: (task: NewTask) => Promise<UserTask>;
  update: (id: string, patch: Parameters<typeof tasksApi.update>[1]) => Promise<UserTask>;
  remove: (id: string) => Promise<void>;
  bulkCreate: (items: Parameters<typeof tasksApi.bulkCreate>[0]) => Promise<{ created: UserTask[] }>;
  generate: (profile: ApplicantProfile) => Promise<{ created: UserTask[] }>;
}

export type { TaskLinks };

/**
 * Preparation tasks of the signed-in applicant, shared by «Задачи», «Дедлайны» and «Олимпиады» so a task
 * created in one place (e.g. «зарегистрироваться на олимпиаду») shows up everywhere at once.
 */
export function useTasks(userId: string | undefined): TasksStore {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await tasksApi.list();
      setTasks(res.items);
      setStats(res.stats);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) void reload();
    else {
      setTasks([]);
      setStats(null);
    }
  }, [userId, reload]);

  // Statistics are computed on the server; refresh them quietly after a change.
  const refreshStats = useCallback(() => {
    tasksApi
      .list()
      .then((res) => {
        setTasks(res.items);
        setStats(res.stats);
      })
      .catch(() => undefined);
  }, []);

  const create = useCallback(
    async (task: NewTask) => {
      const created = await tasksApi.create(task);
      setTasks((prev) => [...prev, created]);
      refreshStats();
      return created;
    },
    [refreshStats],
  );

  const update = useCallback(
    async (id: string, patch: Parameters<typeof tasksApi.update>[1]) => {
      const updated = await tasksApi.update(id, patch);
      setTasks((prev) => prev.map((x) => (x.id === id ? updated : x)));
      refreshStats();
      return updated;
    },
    [refreshStats],
  );

  const remove = useCallback(
    async (id: string) => {
      await tasksApi.remove(id);
      setTasks((prev) => prev.filter((x) => x.id !== id));
      refreshStats();
    },
    [refreshStats],
  );

  const bulkCreate = useCallback(async (items: Parameters<typeof tasksApi.bulkCreate>[0]) => {
    const res = await tasksApi.bulkCreate(items);
    setTasks(res.items);
    setStats(res.stats);
    return res;
  }, []);

  const generate = useCallback(async (profile: ApplicantProfile) => {
    const res = await tasksApi.generate(profile);
    setTasks(res.items);
    setStats(res.stats);
    return res;
  }, []);

  return { tasks, stats, loading, error, reload, create, update, remove, bulkCreate, generate };
}
