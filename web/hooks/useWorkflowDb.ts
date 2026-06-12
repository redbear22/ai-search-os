"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  fetchActionPlan,
  fetchCurrentAudit,
  fetchTaskFolders,
  isWorkflowAuthError,
  saveAudit,
  syncActionPlan,
  syncTaskFolders,
} from "@/lib/workflow-api";
import { normalizeAuditData } from "@/lib/workflow-mappers";
import { useAuditStore } from "@/store/auditStore";
import { useActionStore } from "@/store/actionStore";
import { useTaskStore } from "@/store/taskStore";

const auditDbIdRef = { current: null as string | null };
let workflowDbReady = false;

export function getWorkflowAuditDbId(): string | null {
  return auditDbIdRef.current;
}

export function isWorkflowDbReady(): boolean {
  return workflowDbReady;
}

export function setWorkflowAuditDbId(id: string | null) {
  auditDbIdRef.current = id;
}

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/** Load persisted workflow data from Postgres when user is signed in. */
export function useWorkflowHydration() {
  const { status } = useSession();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || hydratedRef.current) return;

    let cancelled = false;

    void (async () => {
      const failures: string[] = [];

      try {
        const [auditResult, actionsResult, foldersResult] = await Promise.allSettled([
          fetchCurrentAudit(),
          fetchActionPlan(),
          fetchTaskFolders(),
        ]);

        if (cancelled) return;

        if (auditResult.status === "fulfilled") {
          const audit = auditResult.value;
          const auditData = audit ? normalizeAuditData(audit.auditData) : null;
          if (audit && auditData) {
            setWorkflowAuditDbId(audit.id);
            useAuditStore.setState({
              discoverability: auditData.discoverability,
              clarity: auditData.clarity,
              authority: auditData.authority,
              trust: auditData.trust,
              auditBrandName: audit.brandName,
              auditDomain: audit.domain,
              isCompleted: audit.isCompleted,
              completedAt: audit.completedAt,
              lastSavedAt: audit.lastSavedAt,
              isHydrated: true,
            });
          } else if (audit && !auditData) {
            setWorkflowAuditDbId(audit.id);
          }
        } else {
          failures.push("audit");
        }

        if (actionsResult.status === "fulfilled") {
          const actions = actionsResult.value;
          if (actions.length > 0) {
            useActionStore.setState({ actions });
          }
        } else {
          failures.push("action plan");
        }

        if (foldersResult.status === "fulfilled") {
          const folders = foldersResult.value;
          if (folders.length > 0) {
            useTaskStore.setState({
              folders,
              currentFolderId: folders[0]?.id ?? null,
            });
          }
        } else {
          failures.push("tasks");
        }

        if (!useAuditStore.getState().isHydrated) {
          useAuditStore.getState().setHydrated();
        }

        hydratedRef.current = true;

        if (failures.length === 3) {
          toast.error("Could not load saved workspace from database");
        } else if (failures.length > 0) {
          toast.warning("Some saved workspace data could not be loaded");
        }
      } catch {
        if (!cancelled) {
          useAuditStore.getState().setHydrated();
          toast.error("Could not load saved workspace from database");
        }
      } finally {
        if (!cancelled) {
          workflowDbReady = true;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);
}

/** Debounced audit save to Postgres. */
export function useAuditDbSave() {
  const { status } = useSession();

  const persist = useCallback(async () => {
    if (status !== "authenticated") return;

    const state = useAuditStore.getState();
    try {
      const saved = await saveAudit({
        id: getWorkflowAuditDbId(),
        brandName: state.auditBrandName || state.auditDomain || "Audit",
        domain: state.auditDomain || "unknown",
        auditData: {
          discoverability: state.discoverability,
          clarity: state.clarity,
          authority: state.authority,
          trust: state.trust,
        },
        isCompleted: state.isCompleted,
        completedAt: state.completedAt,
      });
      setWorkflowAuditDbId(saved.id);
      useAuditStore.setState({ lastSavedAt: saved.lastSavedAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      toast.error(message);
    }
  }, [status]);

  const debouncedPersist = useRef(debounce(() => void persist(), 800)).current;

  return { saveNow: persist, saveDebounced: debouncedPersist };
}

/** Sync action plan to DB after local changes. */
export function useActionPlanDbSync() {
  const { status } = useSession();
  const syncing = useRef(false);

  const sync = useCallback(async () => {
    if (status !== "authenticated" || syncing.current || !isWorkflowDbReady()) return;
    syncing.current = true;
    try {
      const actions = useActionStore.getState().actions;
      await syncActionPlan(actions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save action plan");
    } finally {
      syncing.current = false;
    }
  }, [status]);

  const debouncedSync = useRef(debounce(() => void sync(), 600)).current;

  useEffect(() => {
    if (status !== "authenticated") return;
    return useActionStore.subscribe(() => {
      debouncedSync();
    });
  }, [status, debouncedSync]);

  return { syncNow: sync };
}

/** Sync task folders to DB after local changes. */
export function useTasksDbSync() {
  const { status } = useSession();
  const syncing = useRef(false);

  const sync = useCallback(async () => {
    if (status !== "authenticated" || syncing.current || !isWorkflowDbReady()) return;
    syncing.current = true;
    try {
      const { folders } = useTaskStore.getState();
      const saved = await syncTaskFolders(folders);
      useTaskStore.setState({
        folders: saved.map((folder) => ({
          ...folder,
          createdAt: new Date(folder.createdAt),
          updatedAt: new Date(folder.updatedAt),
          tasks: folder.tasks.map((task) => ({
            ...task,
            createdAt: new Date(task.createdAt),
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
          })),
        })),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save tasks");
    } finally {
      syncing.current = false;
    }
  }, [status]);

  const debouncedSync = useRef(debounce(() => void sync(), 800)).current;

  useEffect(() => {
    if (status !== "authenticated") return;
    return useTaskStore.subscribe(() => {
      debouncedSync();
    });
  }, [status, debouncedSync]);

  return { syncNow: sync };
}

export async function tryWorkflowApi<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes("401")) return fallback;
    throw error;
  }
}

export { isWorkflowAuthError };
