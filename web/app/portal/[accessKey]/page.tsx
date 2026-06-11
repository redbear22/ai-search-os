"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brandingToCssVars, googleFontStylesheetUrl } from "@/lib/agency-branding";
import type { ClientPortalAudit, ClientPortalDashboardData } from "@/types/client-portal";

export default function ClientPortalDashboard() {
  const params = useParams();
  const accessKey = params.accessKey as string;
  const [client, setClient] = useState<ClientPortalDashboardData["client"] | null>(null);
  const [audits, setAudits] = useState<ClientPortalAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientData = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/client/${encodeURIComponent(accessKey)}/dashboard`);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Unable to load portal");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as ClientPortalDashboardData;
    setClient(data.client);
    setAudits(data.audits);
    setLoading(false);
  }, [accessKey]);

  useEffect(() => {
    void fetchClientData();
  }, [fetchClientData]);

  const branding = client?.branding;
  const fontFamily = branding?.fontFamily ?? "Inter";

  useEffect(() => {
    if (!branding) return;
    const linkId = "portal-branding-font";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = googleFontStylesheetUrl(fontFamily);

    if (branding.favicon) {
      let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = branding.favicon;
    }
  }, [branding, fontFamily]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-muted" />
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

  if (error || !client || !branding) {
    return (
      <div className="container mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-bold">Client Portal</h1>
        <p className="mt-2 text-muted-foreground">{error ?? "Portal unavailable"}</p>
      </div>
    );
  }

  const cssVars = brandingToCssVars({
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    fontFamily: branding.fontFamily,
  });

  const portalTitle =
    branding.portalName?.trim() || `${client.name} Dashboard`;
  const showPoweredBy = !branding.features.brandedEmails;

  return (
    <div
      className="container mx-auto space-y-6 py-8"
      style={{
        ...cssVars,
        fontFamily: `"${branding.fontFamily}", system-ui, sans-serif`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {branding.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo} alt={branding.name} className="h-8" />
          ) : (
            <p
              className="text-sm font-medium"
              style={{ color: branding.primaryColor }}
            >
              {branding.name}
            </p>
          )}
          {branding.portalName ? (
            <span className="text-sm text-muted-foreground">{portalTitle}</span>
          ) : null}
        </div>
        {showPoweredBy ? (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Powered by AI Search Rank</p>
          </div>
        ) : null}
      </div>

      <div>
        <h1 className="text-3xl font-bold">{client.name}</h1>
        <p className="text-muted-foreground" style={{ color: branding.secondaryColor }}>
          Your AI visibility dashboard
        </p>
        {client.domain ? (
          <p className="mt-1 text-sm text-muted-foreground">{client.domain}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Share of Voice</p>
            <p className="text-2xl font-bold" style={{ color: branding.primaryColor }}>
              {client.latestSOV}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Citation Gaps</p>
            <p className="text-2xl font-bold" style={{ color: branding.primaryColor }}>
              {client.gapCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Actions Completed</p>
            <p className="text-2xl font-bold" style={{ color: branding.primaryColor }}>
              {client.completedActions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Improvement</p>
            <p className="text-2xl font-bold text-green-600">+{client.improvement}%</p>
          </CardContent>
        </Card>
      </div>

      {branding.features.showRecommendations ? (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Priority actions from your latest audit will appear here. Contact your agency
              for detailed recommendations.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent Audits</CardTitle>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <p className="text-muted-foreground">
              No audits yet. Your agency will run your first audit soon.
            </p>
          ) : (
            <div className="space-y-4">
              {audits.map((audit) => (
                <div key={audit.id} className="rounded-lg border p-4">
                  <p className="font-medium">
                    Audit {new Date(audit.date).toLocaleDateString()}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Discoverability</p>
                      <p className="text-sm font-semibold">{audit.discoverability}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Clarity</p>
                      <p className="text-sm font-semibold">{audit.clarity}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Authority</p>
                      <p className="text-sm font-semibold">{audit.authority}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Trust</p>
                      <p className="text-sm font-semibold">{audit.trust}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {branding.features.allowClientFeedback ? (
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Share feedback with your agency team. (Coming soon)
            </p>
          </CardContent>
        </Card>
      ) : null}

      {branding.features.enableChat ? (
        <Card>
          <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Live chat with your agency. (Coming soon)
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
