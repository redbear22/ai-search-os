import type { Gap } from "@/types/gap";
import type { ChecklistItem, ProjectTask } from "@/types/task";

function checklistId(): string {
  return crypto.randomUUID();
}

export function generateTaskFromGap(
  gap: Gap
): Omit<ProjectTask, "id" | "createdAt" | "completedAt"> {
  const checklist: ChecklistItem[] = [];
  const source = gap.source || "target publication";

  if (gap.layer === "authority") {
    checklist.push(
      {
        id: checklistId(),
        text: `Research ${source} publication audience and guidelines`,
        completed: false,
      },
      {
        id: checklistId(),
        text: "Prepare unique data point or expert quote",
        completed: false,
      },
      {
        id: checklistId(),
        text: `Draft pitch email for ${source}`,
        completed: false,
      },
      {
        id: checklistId(),
        text: "Send pitch and track response",
        completed: false,
      },
      {
        id: checklistId(),
        text: "Follow up after 5 days if no response",
        completed: false,
      }
    );
  } else if (gap.layer === "clarity") {
    checklist.push(
      {
        id: checklistId(),
        text: "Audit current brand messaging across all platforms",
        completed: false,
      },
      {
        id: checklistId(),
        text: "Create consistent brand positioning statement",
        completed: false,
      },
      {
        id: checklistId(),
        text: "Update website content to reflect positioning",
        completed: false,
      },
      {
        id: checklistId(),
        text: "Update social media profiles",
        completed: false,
      },
      {
        id: checklistId(),
        text: "Run clarity audit again to verify fix",
        completed: false,
      }
    );
  } else if (gap.layer === "discoverability") {
    checklist.push(
      {
        id: checklistId(),
        text: "Research target keywords for this topic",
        completed: false,
      },
      { id: checklistId(), text: "Create content outline", completed: false },
      { id: checklistId(), text: "Write optimized content", completed: false },
      {
        id: checklistId(),
        text: "Add structured data schema",
        completed: false,
      },
      { id: checklistId(), text: "Build internal links", completed: false }
    );
  } else {
    checklist.push(
      {
        id: checklistId(),
        text: "Review current customer feedback",
        completed: false,
      },
      {
        id: checklistId(),
        text: "Identify common pain points",
        completed: false,
      },
      { id: checklistId(), text: "Create response strategy", completed: false },
      { id: checklistId(), text: "Implement changes", completed: false },
      {
        id: checklistId(),
        text: "Monitor review sentiment improvement",
        completed: false,
      }
    );
  }

  const estimatedTime =
    checklist.length <= 3
      ? "1-2 hours"
      : checklist.length <= 5
        ? "2-4 hours"
        : "4-8 hours";

  return {
    title: gap.title,
    description: gap.description,
    checklist,
    status: "not_started",
    priority: gap.severity,
    estimatedTime,
    sourceGapId: gap.id,
    suggestedActionPlan: gap.suggestedAction,
    resourcesNeeded: [gap.suggestedOwner],
  };
}

export function generateSuggestedTasksFromGaps(
  gaps: Gap[]
): Omit<ProjectTask, "id" | "createdAt" | "completedAt">[] {
  const priority = { critical: 4, high: 3, medium: 2, low: 1 } as const;

  const sorted = [...gaps].sort(
    (a, b) => priority[b.severity] - priority[a.severity]
  );

  return sorted.slice(0, 5).map((gap) => generateTaskFromGap(gap));
}
