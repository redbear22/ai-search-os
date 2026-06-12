import type { AuditData } from "@/lib/audit-types";
import type { Action, ActionLayerId, ActionStatus } from "@/store/actionStore";
import type { Gap, GapSeverity } from "@/types/gap";
import type { ChecklistItem, ProjectFolder, ProjectTask } from "@/types/task";
import type { ActionPlan, Gap as DbGap, Task, TaskProject } from "@prisma/client";

export type PersistedAuditEnvelope = {
  id: string;
  brandName: string;
  domain: string;
  auditData: AuditData;
  isCompleted: boolean;
  completedAt: string | null;
  lastSavedAt: string;
  gapCount: number;
};

export function auditRowToEnvelope(row: {
  id: string;
  brandName: string;
  domain: string;
  auditData: unknown;
  isCompleted: boolean;
  completedAt: Date | null;
  updatedAt: Date;
  gapCount: number;
}): PersistedAuditEnvelope {
  return {
    id: row.id,
    brandName: row.brandName,
    domain: row.domain,
    auditData: row.auditData as AuditData,
    isCompleted: row.isCompleted,
    completedAt: row.completedAt?.toISOString() ?? null,
    lastSavedAt: row.updatedAt.toISOString(),
    gapCount: row.gapCount,
  };
}

export function dbGapToUiGap(row: DbGap): Gap {
  const sourceData = (row.sourceData ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    layer: row.layer as Gap["layer"],
    title: row.title,
    description: row.description,
    severity: row.severity as GapSeverity,
    source: String(sourceData.source ?? sourceData.publication ?? ""),
    suggestedAction: String(sourceData.suggestedAction ?? row.description),
    suggestedOwner: row.suggestedOwner ?? "SEO",
    suggestedTimeline: Number.parseInt(row.suggestedTimeline ?? "4", 10) || 4,
    severityScore:
      typeof sourceData.severityScore === "number" ? sourceData.severityScore : undefined,
  };
}

export function uiGapToDbFields(gap: Gap, auditId?: string) {
  return {
    auditId: auditId ?? null,
    layer: gap.layer,
    severity: gap.severity,
    title: gap.title,
    description: gap.description,
    suggestedOwner: gap.suggestedOwner,
    suggestedTimeline: String(gap.suggestedTimeline),
    status: "open",
    sourceData: {
      source: gap.source,
      suggestedAction: gap.suggestedAction,
      severityScore: gap.severityScore,
    },
  };
}

export function actionPlanToAction(row: ActionPlan): Action {
  const resourceAsks = Array.isArray(row.resourceAsks)
    ? (row.resourceAsks as string[])
    : [];
  const status = normalizeActionStatus(row.status);
  return {
    id: row.id,
    layerId: (row.layerId ?? "discoverability") as ActionLayerId,
    description: row.description,
    ownerTeam: row.ownerTeam,
    ownerPerson: row.ownerPerson ?? "",
    dueWeek: row.dueWeek ?? 4,
    resourceAsks,
    status,
    createdAt: row.createdAt.toISOString(),
  };
}

export function actionToActionPlanFields(action: Action, clientId: string, sortOrder: number) {
  return {
    clientId,
    description: action.description,
    ownerTeam: action.ownerTeam,
    ownerPerson: action.ownerPerson || null,
    dueWeek: action.dueWeek,
    status: action.status,
    layerId: action.layerId,
    resourceAsks: action.resourceAsks,
    sortOrder,
  };
}

function normalizeActionStatus(status: string): ActionStatus {
  if (status === "pending") return "not_started";
  if (
    status === "not_started" ||
    status === "in_progress" ||
    status === "completed" ||
    status === "blocked"
  ) {
    return status;
  }
  return "not_started";
}

export function taskRowToProjectTask(row: Task): ProjectTask {
  const checklist = Array.isArray(row.checklist)
    ? (row.checklist as unknown as ChecklistItem[]).map((item) => ({
        ...item,
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
      }))
    : [];
  const resources = Array.isArray(row.resourcesNeeded)
    ? (row.resourcesNeeded as string[])
    : [];

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    checklist,
    status: row.status as ProjectTask["status"],
    priority: row.priority as ProjectTask["priority"],
    dueDate: row.dueDate ?? undefined,
    estimatedTime: row.estimatedTime,
    assignedTo: row.assignedTo ?? undefined,
    sourceGapId: row.gapId ?? undefined,
    suggestedActionPlan: row.suggestedActionPlan,
    resourcesNeeded: resources,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? undefined,
  };
}

export function projectTaskToDbFields(
  task: Omit<ProjectTask, "id" | "createdAt"> & { id?: string },
  sortOrder: number
) {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    gapId: task.sourceGapId ?? null,
    checklist: task.checklist,
    dueDate: task.dueDate ?? null,
    estimatedTime: task.estimatedTime,
    assignedTo: task.assignedTo ?? null,
    suggestedActionPlan: task.suggestedActionPlan,
    resourcesNeeded: task.resourcesNeeded,
    sortOrder,
    completedAt: task.completedAt ?? null,
  };
}

export function folderFromProject(
  project: TaskProject & { tasks: Task[] },
  calculateProgress: (tasks: ProjectTask[]) => number
): ProjectFolder {
  const tasks = project.tasks
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(taskRowToProjectTask);
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    tasks,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    progress: calculateProgress(tasks),
  };
}

export function calculateFolderProgress(tasks: ProjectTask[]): number {
  if (tasks.length === 0) return 0;
  let totalItems = 0;
  let completedItems = 0;
  for (const task of tasks) {
    totalItems += task.checklist.length;
    completedItems += task.checklist.filter((item) => item.completed).length;
  }
  return totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
}
