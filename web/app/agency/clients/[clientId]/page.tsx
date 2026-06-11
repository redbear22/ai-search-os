"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClientDetail = {
  id: string;
  name: string;
  domain: string | null;
  settings: {
    shareWithClient: boolean;
    reportFrequency: string;
  } | null;
};

export default function ManageClientPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? "";
  const [client, setClient] = useState<ClientDetail | null>(null);

  useEffect(() => {
    void fetch("/api/agency/clients")
      .then((res) => res.json())
      .then((data: ClientDetail[] | { clients: ClientDetail[] }) => {
        const clients = Array.isArray(data) ? data : data.clients;
        setClient(clients.find((c) => c.id === clientId) ?? null);
      });
  }, [clientId]);

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
          <CardTitle>{client?.name ?? "Client"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Domain:</span>{" "}
            {client?.domain || "Not set"}
          </p>
          <p>
            <span className="text-muted-foreground">Report frequency:</span>{" "}
            {client?.settings?.reportFrequency ?? "monthly"}
          </p>
          <div className="flex flex-col gap-1 pt-2">
            <Link
              href={`/agency/clients/${clientId}/fixes`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Automated fixes →
            </Link>
            <Link
              href={`/agency/clients/${clientId}/autonomous`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Autonomous audits →
            </Link>
            <Link
              href={`/agency/clients/${clientId}/health`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Health dashboard →
            </Link>
            <Link
              href="/agency/intelligence-network"
              className="text-sm font-medium text-primary hover:underline"
            >
              Intelligence network →
            </Link>
            <Link
              href={`/agency/clients/${clientId}/roi`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Predictive ROI →
            </Link>
            <Link
              href={`/agency/clients/${clientId}/report`}
              className="text-sm font-medium text-primary hover:underline"
            >
              White-label report →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
