"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { WorkflowDbProvider } from "@/components/WorkflowDbProvider";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <WorkflowDbProvider>{children}</WorkflowDbProvider>
    </SessionProvider>
  );
}
