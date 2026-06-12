import type { AuditData } from "@/lib/audit-types";
import type { Action } from "@/store/actionStore";
import type { Gap } from "@/types/gap";
import type { ProjectFolder, ProjectTask } from "@/types/task";
import type { GapFix } from "@/types";
import type { PersistedAuditEnvelope } from "@/lib/workflow-mappers";

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function isWorkflowAuthError(status: number): boolean {
  return status === 401 || status === 403 || status === 404;
}

export async function fetchCurrentAudit(): Promise<PersistedAuditEnvelope | null> {
  const res = await fetch("/api/audit/current");
  if (!res.ok) {
    if (isWorkflowAuthError(res.status)) return null;
    throw new Error("Failed to load audit");
  }
  const data = await parseJson<{ audit: PersistedAuditEnvelope | null }>(res);
  return data.audit;
}

export async function saveAudit(input: {
  id?: string | null;
  brandName: string;
  domain: string;
  auditData: AuditData;
  isCompleted: boolean;
  completedAt: string | null;
  gapCount?: number;
}): Promise<PersistedAuditEnvelope> {
  const res = await fetch("/api/audit/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: input.id ?? undefined,
      brandName: input.brandName,
      domain: input.domain,
      auditData: input.auditData,
      isCompleted: input.isCompleted,
      completedAt: input.completedAt,
      gapCount: input.gapCount,
    }),
  });
  const data = await parseJson<{ audit?: PersistedAuditEnvelope; error?: string }>(res);
  if (!res.ok || !data.audit) {
    throw new Error(data.error ?? "Failed to save audit");
  }
  return data.audit;
}

export async function fetchGaps(auditId?: string): Promise<Gap[]> {
  const url = auditId
    ? `/api/gaps?auditId=${encodeURIComponent(auditId)}`
    : "/api/gaps";
  const res = await fetch(url);
  if (!res.ok) {
    if (isWorkflowAuthError(res.status)) return [];
    throw new Error("Failed to load gaps");
  }
  const data = await parseJson<{ gaps: Gap[] }>(res);
  return data.gaps;
}

export async function persistGaps(input: {
  auditId?: string;
  gaps: Gap[];
  replace?: boolean;
}): Promise<Gap[]> {
  const res = await fetch("/api/gaps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ gaps: Gap[]; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to save gaps");
  }
  return data.gaps;
}

export async function updateGap(
  id: string,
  patch: { status?: string; fixGenerated?: GapFix | null }
): Promise<void> {
  const res = await fetch(`/api/gaps/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const data = await parseJson<{ error?: string }>(res);
    throw new Error(data.error ?? "Failed to update gap");
  }
}

export async function fetchActionPlan(): Promise<Action[]> {
  const res = await fetch("/api/action-plan");
  if (!res.ok) {
    if (isWorkflowAuthError(res.status)) return [];
    throw new Error("Failed to load action plan");
  }
  const data = await parseJson<{ actions: Action[] }>(res);
  return data.actions;
}

export async function syncActionPlan(actions: Action[]): Promise<Action[]> {
  const res = await fetch("/api/action-plan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actions }),
  });
  const data = await parseJson<{ actions: Action[]; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to sync action plan");
  }
  return data.actions;
}

export async function fetchTaskFolders(): Promise<ProjectFolder[]> {
  const res = await fetch("/api/tasks");
  if (!res.ok) {
    if (isWorkflowAuthError(res.status)) return [];
    throw new Error("Failed to load tasks");
  }
  const data = await parseJson<{ folders: ProjectFolder[] }>(res);
  return data.folders.map((folder) => ({
    ...folder,
    createdAt: new Date(folder.createdAt),
    updatedAt: new Date(folder.updatedAt),
    tasks: folder.tasks.map((task) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
      checklist: task.checklist.map((item) => ({
        ...item,
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
      })),
    })),
  }));
}

export async function syncTaskFolders(folders: ProjectFolder[]): Promise<ProjectFolder[]> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "sync", folders }),
  });
  const data = await parseJson<{ folders: ProjectFolder[]; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to sync tasks");
  }
  return data.folders;
}

export async function createTaskFolder(name: string, description = ""): Promise<ProjectFolder> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "folder", name, description }),
  });
  const data = await parseJson<{ folder: ProjectFolder; error?: string }>(res);
  if (!res.ok || !data.folder) {
    throw new Error(data.error ?? "Failed to create folder");
  }
  return data.folder;
}

export async function createTask(
  projectId: string,
  task: Omit<ProjectTask, "id" | "createdAt">
): Promise<ProjectTask> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "task", projectId, task }),
  });
  const data = await parseJson<{ task: ProjectTask; error?: string }>(res);
  if (!res.ok || !data.task) {
    throw new Error(data.error ?? "Failed to create task");
  }
  return data.task;
}
