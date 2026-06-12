"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus,
  Users,
  Briefcase,
  TrendingUp,
  Settings,
  ExternalLink,
  Network,
} from "lucide-react";
import { buildAuditUrl } from "@/lib/audit-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  canManageClients,
  canManageTeam,
  hasAgencyPermission,
} from "@/lib/agency-rbac";
import type { AgencyDashboardData } from "@/types/agency";

export default function AgencyDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const agencyRole = session?.user?.agencyRole;
  const canManage = agencyRole ? canManageClients(agencyRole) : false;
  const canTeam = agencyRole ? canManageTeam(agencyRole) : false;
  const canBilling = agencyRole ? hasAgencyPermission(agencyRole, "billing") : false;
  const canBrand = agencyRole ? hasAgencyPermission(agencyRole, "manage_agency") : false;
  const router = useRouter();
  const [agency, setAgency] = useState<AgencyDashboardData["agency"]>(null);
  const [clients, setClients] = useState<AgencyDashboardData["clients"]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgencyData = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/agency/dashboard");
    if (res.status === 404) {
      setNeedsSetup(true);
      setAgency(null);
      setClients([]);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("Failed to load agency dashboard");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as AgencyDashboardData;
    setAgency(data.agency);
    setClients(data.clients);
    setNeedsSetup(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!session?.user) {
      setLoading(false);
      router.push("/auth/signin?callbackUrl=/agency");
      return;
    }

    setAgencyName(session.user.name ? `${session.user.name}'s Agency` : "My Agency");
    void fetchAgencyData();
  }, [session, sessionStatus, fetchAgencyData, router]);

  const handleSetup = async () => {
    setSetupLoading(true);
    setError(null);
    const res = await fetch("/api/agency/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agencyName }),
    });
    if (!res.ok) {
      setError("Failed to create agency workspace");
      setSetupLoading(false);
      return;
    }
    setSetupLoading(false);
    setLoading(true);
    await fetchAgencyData();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="container mx-auto max-w-lg py-16">
        <Card>
          <CardHeader>
            <CardTitle>Set up your agency workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create an agency workspace to manage multiple SEO clients from one dashboard.
            </p>
            <div className="space-y-2">
              <Label htmlFor="agency-name">Agency name</Label>
              <Input
                id="agency-name"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Acme SEO Agency"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleSetup} disabled={setupLoading || !agencyName.trim()}>
              {setupLoading ? "Creating..." : "Create Agency Workspace"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agency Dashboard</h1>
          <p className="text-muted-foreground">
            Manage all your SEO clients in one place
            {agency?.name ? ` — ${agency.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/agency/intelligence-network")}
          >
            <Network className="mr-2 h-4 w-4" />
            Intelligence Network
          </Button>
          {canTeam ? (
            <Button variant="outline" onClick={() => router.push("/agency/team")}>
              <Users className="mr-2 h-4 w-4" />
              Team
            </Button>
          ) : null}
          {canBrand ? (
            <Button variant="outline" onClick={() => router.push("/agency/branding")}>
              <Settings className="mr-2 h-4 w-4" />
              Branding
            </Button>
          ) : null}
          {canManage ? (
            <Button variant="outline" onClick={() => router.push("/agency/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              {canBilling ? "Agency Settings" : "Settings"}
            </Button>
          ) : null}
          {canManage ? (
            <Button onClick={() => router.push("/agency/clients/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          ) : null}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{agency?.teamCount ?? 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Audits</p>
                <p className="text-2xl font-bold">{agency?.totalAudits ?? 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Client Portal</p>
                <p className="text-2xl font-bold">
                  {clients.filter((c) => c.settings?.shareWithClient).length}
                </p>
              </div>
              <ExternalLink className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No clients yet</p>
              <Button className="mt-4" onClick={() => router.push("/agency/clients/new")}>
                Add Your First Client
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="hover-lift flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-semibold">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {client.domain || "Domain not set"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last audit: {client.lastAuditDate || "Never"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/agency/clients/${client.id}/portal`)}
                    >
                      Client Portal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/agency/clients/${client.id}/health`)}
                    >
                      Health
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/agency/clients/${client.id}/report`)}
                    >
                      Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/agency/clients/${client.id}`)}
                    >
                      Manage
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          buildAuditUrl({
                            clientId: client.id,
                            domain: client.domain,
                            brandName: client.name,
                          })
                        )
                      }
                    >
                      Run Audit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
