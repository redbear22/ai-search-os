"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type ClientPortal = {
  id: string;
  name: string;
  settings: {
    shareWithClient: boolean;
    clientAccessKey: string | null;
  } | null;
};

export default function ClientPortalPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { toast } = useToast();
  const [client, setClient] = useState<ClientPortal | null>(null);

  useEffect(() => {
    void fetch("/api/agency/clients")
      .then((res) => res.json())
      .then((data: ClientPortal[] | { clients: ClientPortal[] }) => {
        const clients = Array.isArray(data) ? data : data.clients;
        setClient(clients.find((c) => c.id === clientId) ?? null);
      });
  }, [clientId]);

  const copyAccessKey = () => {
    const key = client?.settings?.clientAccessKey;
    if (!key) return;
    void navigator.clipboard.writeText(key);
    toast({ title: "Access key copied" });
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Link
        href="/agency"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Agency Dashboard
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Client Portal — {client?.name ?? "Client"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share read-only audit reports with your client using their access key.
          </p>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">Access key</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate text-sm">
                {client?.settings?.clientAccessKey ?? "—"}
              </code>
              <Button variant="outline" size="sm" onClick={copyAccessKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Portal sharing:{" "}
            {client?.settings?.shareWithClient ? "Enabled" : "Disabled"}
          </p>
          {client?.settings?.clientAccessKey ? (
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Client portal URL</p>
              <code className="mt-1 block break-all text-sm">
                /portal/{client.settings.clientAccessKey}
              </code>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
