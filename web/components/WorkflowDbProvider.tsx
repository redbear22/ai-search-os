"use client";

import { useWorkflowHydration } from "@/hooks/useWorkflowDb";

/** Loads audit, action plan, and tasks from Postgres for signed-in users. */
export function WorkflowDbProvider({ children }: { children: React.ReactNode }) {
  useWorkflowHydration();
  return <>{children}</>;
}
