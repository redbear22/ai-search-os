"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientAuditDetailPage() {
  const params = useParams<{ clientId: string; auditId: string }>();
  const clientId = params?.clientId ?? "";
  const auditId = params?.auditId ?? "";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [found, setFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/audit/${auditId}`);
        if (!cancelled) setFound(res.ok);
      } catch {
        if (!cancelled) setFound(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [auditId]);

  if (loading) {
    return (
      <div className="container mx-auto flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-8">
      <Link
        href={`/agency/clients/${clientId}/audit`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to audit hub
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Audit Run</CardTitle>
          <CardDescription className="font-mono text-xs">{auditId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {found ? (
            <p className="text-sm text-muted-foreground">
              This audit is stored in your workspace. Open the full audit experience to review
              layers, gaps, and fixes.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Audit details are unavailable in this session. Run a new audit or switch to this
              client in your workspace to view full results.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push(`/audit?clientId=${clientId}`)}>
              <Play className="mr-2 h-4 w-4" />
              Open audit workspace
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/agency/clients/${clientId}/audit`}>Audit hub</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
