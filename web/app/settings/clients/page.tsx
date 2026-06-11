"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkspaceClient } from "@/store/workspaceStore";
import { useWorkspaceStore } from "@/store/workspaceStore";

export default function ClientsSettingsPage() {
  const { data: session, status } = useSession();
  const { loadClients, switchClient } = useWorkspaceStore();
  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");

  const canManage =
    session?.user?.agencyRole === "AGENCY_OWNER" ||
    session?.user?.agencyRole === "AGENCY_ADMIN" ||
    session?.user?.agencyRole === "AGENCY_TEAM";

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agency/clients");
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to load clients");
      }
      const data = (await res.json()) as WorkspaceClient[];
      setClients(data);
      await loadClients();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load clients"
      );
    } finally {
      setLoading(false);
    }
  }, [loadClients]);

  useEffect(() => {
    if (status === "authenticated") {
      void fetchClients();
    }
  }, [status, fetchClients]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agency/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to create client");
      }
      setName("");
      setDomain("");
      toast.success("Client created");
      await fetchClients();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create client"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(clientId: string) {
    if (!confirm("Delete this client and all related data?")) return;
    try {
      const res = await fetch(`/api/agency/clients/${clientId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to delete client");
      }
      toast.success("Client deleted");
      await fetchClients();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete client"
      );
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-3xl space-y-2 p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in required</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/signin" className="text-primary underline">
            Sign in
          </Link>{" "}
          to manage agency clients.
        </p>
      </div>
    );
  }

  if (!session.user.agencyId) {
    return (
      <div className="mx-auto max-w-3xl space-y-2 p-8">
        <h1 className="text-2xl font-semibold tracking-tight">No agency workspace</h1>
        <p className="text-sm text-muted-foreground">
          Run the agency demo seed script to create a workspace, or ask an admin to
          assign your account to an agency.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agency clients</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage SEO client workspaces for your agency.
        </p>
      </div>

      {canManage ? (
        <form
          onSubmit={handleCreate}
          className="grid gap-4 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <div className="space-y-2">
            <Label htmlFor="client-name">Client name</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-domain">Domain (optional)</Label>
            <Input
              id="client-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="acme.com"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add client
            </Button>
          </div>
        </form>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No clients yet.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.domain ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void switchClient(client.id)}
                      >
                        Switch
                      </Button>
                      {(session.user.agencyRole === "AGENCY_OWNER" ||
                        session.user.agencyRole === "AGENCY_ADMIN") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDelete(client.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
