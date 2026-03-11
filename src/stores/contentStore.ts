import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Module {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  lesson_count: number;
  order: number;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  order: number;
}

interface LessonProgress {
  lesson_id: string;
  watch_seconds: number;
  completed: boolean;
  completed_at: string | null;
}

interface ContentState {
  modules: Module[];
  lessons: Record<string, Lesson[]>; // keyed by module_id
  progress: Record<string, LessonProgress>; // keyed by lesson_id
  isLoading: boolean;

  fetchModules: () => Promise<void>;
  fetchLessons: (moduleId: string) => Promise<void>;
  fetchProgress: (userId: string) => Promise<void>;
  updateProgress: (userId: string, lessonId: string, watchSeconds: number, completed: boolean) => Promise<void>;

  // Computed
  getModuleProgress: (moduleId: string) => number;
  getCompletedCount: () => number;
  getRecentLesson: () => { lesson: Lesson; module: Module } | null;
}

export const useContentStore = create<ContentState>((set, get) => ({
  modules: [],
  lessons: {},
  progress: {},
  isLoading: false,

  fetchModules: async () => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('modules')
      .select('*')
      .order('order', { ascending: true });

    set({ modules: (data ?? []) as Module[], isLoading: false });
  },

  fetchLessons: async (moduleId) => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('order', { ascending: true });

    const lessons = get().lessons;
    set({ lessons: { ...lessons, [moduleId]: (data ?? []) as Lesson[] } });
  },

  fetchProgress: async (userId) => {
    const { data } = await supabase
      .from('user_lesson_progress')
      .select('lesson_id, watch_seconds, completed, completed_at')
      .eq('user_id', userId);

    const progressMap: Record<string, LessonProgress> = {};
    (data ?? []).forEach((p: any) => {
      progressMap[p.lesson_id] = p;
    });
    set({ progress: progressMap });
  },

  updateProgress: async (userId, lessonId, watchSeconds, completed) => {
    await supabase.from('user_lesson_progress').upsert({
      user_id: userId,
      lesson_id: lessonId,
      watch_seconds: watchSeconds,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    });

    const progress = get().progress;
    set({
      progress: {
        ...progress,
        [lessonId]: {
          lesson_id: lessonId,
          watch_seconds: watchSeconds,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        },
      },
    });
  },

  getModuleProgress: (moduleId) => {
    const { lessons, progress } = get();
    const moduleLessons = lessons[moduleId] ?? [];
    if (moduleLessons.length === 0) return 0;
    const completed = moduleLessons.filter((l) => progress[l.id]?.completed).length;
    return completed / moduleLessons.length;
  },

  getCompletedCount: () => {
    const { progress } = get();
    return Object.values(progress).filter((p) => p.completed).length;
  },

  getRecentLesson: () => {
    const { progress, lessons, modules } = get();
    const recent = Object.values(progress)
      .filter((p) => !p.completed && p.watch_seconds > 0)
      .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));

    if (recent.length === 0) return null;

    const lessonId = recent[0].lesson_id;
    for (const mod of modules) {
      const modLessons = lessons[mod.id] ?? [];
      const lesson = modLessons.find((l) => l.id === lessonId);
      if (lesson) return { lesson, module: mod };
    }
    return null;
  },
}));
