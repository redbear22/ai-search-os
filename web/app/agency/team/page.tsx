"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UserPlus, Users } from "lucide-react";
import type { AgencyRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AGENCY_ROLE_DESCRIPTIONS,
  AGENCY_ROLE_LABELS,
  canManageTeam,
  INVITABLE_ROLES,
} from "@/lib/agency-rbac";
import type { AgencyTeamData } from "@/types/agency-team";

export default function AgencyTeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [team, setTeam] = useState<AgencyTeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AgencyRole>("AGENCY_TEAM");
  const [viewerClientId, setViewerClientId] = useState("");
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([]);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/agency/team");
    if (res.status === 403) {
      router.replace("/agency");
      return;
    }
    if (!res.ok) {
      setLoading(false);
      toast({ title: "Failed to load team", variant: "destructive" });
      return;
    }
    setTeam((await res.json()) as AgencyTeamData);
    setLoading(false);
  }, [router, toast]);

  useEffect(() => {
    if (status === "authenticated") void loadTeam();
  }, [status, loadTeam]);

  const toggleClientAssignment = (clientId: string, checked: boolean) => {
    setAssignedClientIds((prev) =>
      checked ? [...prev, clientId] : prev.filter((id) => id !== clientId)
    );
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    const res = await fetch("/api/agency/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        agencyRole: role,
        clientId: role === "CLIENT_VIEWER" ? viewerClientId : undefined,
        clientIds: role === "AGENCY_TEAM" ? assignedClientIds : undefined,
      }),
    });

    const data = (await res.json()) as { error?: string; message?: string; status?: string };
    setInviting(false);

    if (!res.ok) {
      toast({ title: data.error ?? "Invite failed", variant: "destructive" });
      return;
    }

    toast({
      title: data.status === "pending" ? "Invite saved" : "Team member added",
      description: data.message,
    });
    setEmail("");
    setAssignedClientIds([]);
    setViewerClientId("");
    void loadTeam();
  };

  const removeMember = async (userId: string) => {
    const res = await fetch(`/api/agency/team/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast({ title: data.error ?? "Remove failed", variant: "destructive" });
      return;
    }
    toast({ title: "Team member removed" });
    void loadTeam();
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const agencyRole = session?.user?.agencyRole;
  if (!agencyRole || !canManageTeam(agencyRole)) {
    return (
      <div className="container mx-auto max-w-lg py-16 text-center">
        <p className="text-muted-foreground">You do not have permission to manage team members.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/agency")}>
          Back to Agency
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-8">
      <Link
        href="/agency"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Agency Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Invite members and assign roles ({team?.limits.currentCount ?? 0}/
            {team?.limits.teamMemberLimit ?? 1} seats)
          </p>
        </div>
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite team member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@agency.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AgencyRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITABLE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {AGENCY_ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {AGENCY_ROLE_DESCRIPTIONS[role]}
                </p>
              </div>

              {role === "CLIENT_VIEWER" && (
                <div className="space-y-2">
                  <Label>Client portal access</Label>
                  <Select value={viewerClientId} onValueChange={setViewerClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {team?.clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {role === "AGENCY_TEAM" && (team?.clients.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <Label>Assigned clients</Label>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                    {team?.clients.map((client) => (
                      <label
                        key={client.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={assignedClientIds.includes(client.id)}
                          onCheckedChange={(checked) =>
                            toggleClientAssignment(client.id, checked === true)
                          }
                        />
                        {client.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" disabled={inviting || !email.trim()}>
                {inviting ? "Inviting..." : "Send invite"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(Object.keys(AGENCY_ROLE_LABELS) as AgencyRole[]).map((r) => (
              <div key={r} className="rounded-lg border p-3">
                <p className="font-medium">{AGENCY_ROLE_LABELS[r]}</p>
                <p className="text-muted-foreground">{AGENCY_ROLE_DESCRIPTIONS[r]}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {team?.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{member.name ?? member.email}</p>
                  <Badge variant="secondary">{AGENCY_ROLE_LABELS[member.agencyRole]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{member.email}</p>
                {member.assignedClients.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assigned: {member.assignedClients.map((c) => c.name).join(", ")}
                  </p>
                ) : null}
              </div>
              {member.id !== session?.user?.id &&
              member.agencyRole !== "AGENCY_OWNER" &&
              agencyRole === "AGENCY_OWNER" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void removeMember(member.id)}
                >
                  Remove
                </Button>
              ) : null}
              {member.agencyRole === "AGENCY_OWNER" ? (
                <Badge variant="outline">Owner</Badge>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {(team?.pendingInvites.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {team?.pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-muted-foreground">
                    {AGENCY_ROLE_LABELS[invite.agencyRole]} · expires{" "}
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
