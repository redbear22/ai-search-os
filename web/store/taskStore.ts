import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProjectFolder, ProjectTask } from "@/types/task";

interface TaskStore {
  folders: ProjectFolder[];
  currentFolderId: string | null;
  addFolder: (
    folder: Omit<ProjectFolder, "id" | "createdAt" | "updatedAt" | "progress">
  ) => void;
  addTask: (
    folderId: string,
    task: Omit<ProjectTask, "id" | "createdAt" | "completedAt">
  ) => void;
  updateTask: (taskId: string, updates: Partial<ProjectTask>) => void;
  updateChecklistItem: (
    taskId: string,
    itemId: string,
    completed: boolean,
    notes?: string
  ) => void;
  deleteTask: (taskId: string) => void;
  deleteFolder: (folderId: string) => void;
  setCurrentFolderId: (folderId: string | null) => void;
  calculateProgress: (folderId: string) => number;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      folders: [],
      currentFolderId: null,

      addFolder: (folder) =>
        set((state) => {
          const id = newId();
          return {
            folders: [
              ...state.folders,
              {
                ...folder,
                id,
                createdAt: new Date(),
                updatedAt: new Date(),
                progress: 0,
              },
            ],
            currentFolderId: state.currentFolderId ?? id,
          };
        }),

      addTask: (folderId, task) =>
        set((state) => ({
          folders: state.folders.map((folder) => {
            if (folder.id !== folderId) return folder;
            const newTask: ProjectTask = {
              ...task,
              id: newId(),
              createdAt: new Date(),
              completedAt: undefined,
            };
            const tasks = [...folder.tasks, newTask];
            return {
              ...folder,
              tasks,
              updatedAt: new Date(),
              progress: get().calculateProgress(folder.id),
            };
          }),
        })),

      updateTask: (taskId, updates) =>
        set((state) => ({
          folders: state.folders.map((folder) => ({
            ...folder,
            tasks: folder.tasks.map((task) =>
              task.id === taskId ? { ...task, ...updates } : task
            ),
            updatedAt: new Date(),
            progress: get().calculateProgress(folder.id),
          })),
        })),

      updateChecklistItem: (taskId, itemId, completed, notes) =>
        set((state) => ({
          folders: state.folders.map((folder) => ({
            ...folder,
            tasks: folder.tasks.map((task) => {
              if (task.id !== taskId) return task;

              const checklist = task.checklist.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      completed,
                      completedAt: completed ? new Date() : undefined,
                      notes: notes ?? item.notes,
                    }
                  : item
              );

              const allCompleted =
                checklist.length > 0 && checklist.every((i) => i.completed);
              const someCompleted = checklist.some((i) => i.completed);

              return {
                ...task,
                checklist,
                status: allCompleted
                  ? "completed"
                  : someCompleted
                    ? "in_progress"
                    : "not_started",
                completedAt: allCompleted ? new Date() : undefined,
              };
            }),
            updatedAt: new Date(),
            progress: get().calculateProgress(folder.id),
          })),
        })),

      deleteTask: (taskId) =>
        set((state) => ({
          folders: state.folders.map((folder) => ({
            ...folder,
            tasks: folder.tasks.filter((task) => task.id !== taskId),
            updatedAt: new Date(),
            progress: get().calculateProgress(folder.id),
          })),
        })),

      deleteFolder: (folderId) =>
        set((state) => {
          const folders = state.folders.filter((folder) => folder.id !== folderId);
          return {
            folders,
            currentFolderId:
              state.currentFolderId === folderId
                ? folders[0]?.id ?? null
                : state.currentFolderId,
          };
        }),

      setCurrentFolderId: (folderId) => set({ currentFolderId: folderId }),

      calculateProgress: (folderId) => {
        const folder = get().folders.find((f) => f.id === folderId);
        if (!folder || folder.tasks.length === 0) return 0;

        let totalItems = 0;
        let completedItems = 0;

        for (const task of folder.tasks) {
          totalItems += task.checklist.length;
          completedItems += task.checklist.filter((item) => item.completed).length;
        }

        return totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
      },
    }),
    {
      name: "task-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
