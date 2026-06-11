"use client";

import { UserMenu } from "@/components/UserMenu";
import { SyncStatus } from "@/components/SyncStatus";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          AI Search Operating System
        </span>
      </div>
      <div className="flex items-center gap-4">
        <SyncStatus />
        <UserMenu />
      </div>
    </header>
  );
}
