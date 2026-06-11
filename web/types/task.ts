export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
  status: "not_started" | "in_progress" | "completed" | "blocked";
  priority: "critical" | "high" | "medium" | "low";
  dueDate?: Date;
  estimatedTime: string;
  assignedTo?: string;
  sourceGapId?: string;
  suggestedActionPlan: string;
  resourcesNeeded: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface ProjectFolder {
  id: string;
  name: string;
  description: string;
  tasks: ProjectTask[];
  createdAt: Date;
  updatedAt: Date;
  progress: number;
}
