"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { toastApiError } from "@/lib/api-error";
import { useAuditStore } from "@/store/auditStore";
import type { CitationEngineResponse } from "@/lib/citation-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StringArrayInput } from "@/components/audit/string-array-input";

async function fetchCeEndpoint(path: string): Promise<CitationEngineResponse> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json() as Promise<CitationEngineResponse>;
}

export function AuthorityLayer() {
  const { authority, setAuthority, setAuthorityArray } = useAuditStore();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importFromCitationEngine = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const [ours, competitors] = await Promise.all([
        fetchCeEndpoint("/api/citation-engine/sources-citing-us"),
        fetchCeEndpoint("/api/citation-engine/competitor-sources"),
      ]);

      setAuthorityArray("sourcesCitingUs", ours.sources);
      setAuthorityArray("sourcesCitingCompetitorsOnly", competitors.sources);
      setAuthority({ citedPages: ours.sources.length });

      const warnings = [ours.error, competitors.error].filter(Boolean);
      if (warnings.length) {
        setStatus(warnings.join(" · "));
      } else if (ours.mock || competitors.mock) {
        setStatus("Loaded mock data (Citation Engine unavailable).");
      } else {
        setStatus(
          `Imported ${ours.sources.length} sources citing us and ${competitors.sources.length} competitor-only sources.`
        );
      }
    } catch {
      setError("Import failed");
      toastApiError();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <CardSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Authority layer</CardTitle>
          <CardDescription>
            Citation footprint — who links to you vs competitors only
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={importFromCitationEngine}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Import from Citation Engine
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {(status || error) && (
          <div className="space-y-1">
            {status && (
              <p className="text-sm text-muted-foreground">
                {status}
                {status.includes("mock") && (
                  <Badge variant="secondary" className="ml-2">
                    Mock
                  </Badge>
                )}
              </p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="backlinks">Backlinks count</Label>
            <Input
              id="backlinks"
              type="number"
              value={authority.backlinksCount}
              onChange={(e) => setAuthority({ backlinksCount: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="citedPages">Cited pages</Label>
            <Input
              id="citedPages"
              type="number"
              value={authority.citedPages}
              onChange={(e) => setAuthority({ citedPages: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <StringArrayInput
            label="Sources citing us"
            items={authority.sourcesCitingUs}
            onChange={(items) => setAuthorityArray("sourcesCitingUs", items)}
            placeholder="https://example.com/article"
          />
          <StringArrayInput
            label="Sources citing competitors only"
            items={authority.sourcesCitingCompetitorsOnly}
            onChange={(items) => setAuthorityArray("sourcesCitingCompetitorsOnly", items)}
            placeholder="https://competitor-cited-source.com"
          />
        </div>
      </CardContent>
    </Card>
  );
}
