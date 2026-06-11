"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, Settings, BarChart3, Activity } from "lucide-react";
import Link from "next/link";

type ClientDetail = {
  id: string;
  name: string;
  domain: string;
  status: "active" | "inactive" | "pending";
  createdAt: string;
  lastAuditAt: string | null;
  healthScore: number | null;
};

export default function ManageClientPage() {
  const params = useParams();
  const clientId = (params?.clientId as string) ?? "";
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data);
      }
    } catch (error) {
      console.error("Failed to fetch client:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Client not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground mt-1">{client.domain}</p>
        </div>
        <Badge variant={client.status === "active" ? "default" : "secondary"}>
          {client.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`/agency/clients/${clientId}/audit`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Audit
              </CardTitle>
              <CardDescription>Run and view audit reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                Go to Audit <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/agency/clients/${clientId}/health`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Health
              </CardTitle>
              <CardDescription>View health metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {client.healthScore !== null && (
                <div className="mb-3">
                  <span className="text-2xl font-bold">{client.healthScore}%</span>
                  <span className="text-muted-foreground text-sm ml-2">Overall</span>
                </div>
              )}
              <Button variant="ghost" className="w-full">
                View Health <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/agency/clients/${clientId}/settings`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
              <CardDescription>Configure client settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                Configure <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Client ID</dt>
              <dd className="font-mono text-sm">{client.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd>{new Date(client.createdAt).toLocaleDateString()}</dd>
            </div>
            {client.lastAuditAt && (
              <div>
                <dt className="text-sm text-muted-foreground">Last Audit</dt>
                <dd>{new Date(client.lastAuditAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}