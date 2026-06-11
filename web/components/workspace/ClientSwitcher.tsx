"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { Building2, ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspaceStore";

type ClientSwitcherProps = {
  className?: string;
  compact?: boolean;
};

export function ClientSwitcher({ className, compact }: ClientSwitcherProps) {
  const { data: session, status } = useSession();
  const {
    clients,
    activeClientId,
    loading,
    error,
    loadClients,
    switchClient,
    setActiveClientId,
  } = useWorkspaceStore();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.user?.activeClientId) {
      setActiveClientId(session.user.activeClientId);
    }
    void loadClients();
  }, [status, session?.user?.activeClientId, loadClients, setActiveClientId]);

  if (status !== "authenticated") return null;

  const activeClient =
    clients.find((c) => c.id === activeClientId) ?? clients[0] ?? null;

  if (!loading && clients.length === 0 && !session?.user?.agencyId) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn(
            "max-w-[220px] justify-between gap-2 font-normal",
            className
          )}
          disabled={loading && clients.length === 0}
        >
          <span className="flex min-w-0 items-center gap-2">
            {loading && clients.length === 0 ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">
              {activeClient?.name ?? "Select client"}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Workspace client</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {error ? (
          <DropdownMenuItem disabled className="text-destructive">
            {error}
          </DropdownMenuItem>
        ) : null}
        {clients.map((client) => (
          <DropdownMenuItem
            key={client.id}
            onClick={() => void switchClient(client.id)}
            className={cn(
              client.id === activeClientId && "bg-accent font-medium"
            )}
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate">{client.name}</span>
              {client.domain ? (
                <span className="truncate text-xs text-muted-foreground">
                  {client.domain}
                </span>
              ) : null}
            </div>
          </DropdownMenuItem>
        ))}
        {clients.length === 0 && !loading ? (
          <DropdownMenuItem disabled>No clients yet</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
