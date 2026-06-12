"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type ClientSettings = {
  id: string;
  name: string;
  domain: string | null;
  settings: {
    reportFrequency: string;
    shareWithClient: boolean;
    emailReports: boolean;
    brandColor: string;
    reportFooterText: string | null;
  } | null;
};

export default function ClientSettingsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? "";
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [reportFrequency, setReportFrequency] = useState("monthly");
  const [shareWithClient, setShareWithClient] = useState(false);
  const [emailReports, setEmailReports] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agency/clients/${clientId}`);
    if (!res.ok) {
      setLoading(false);
      toast({ title: "Failed to load client", variant: "destructive" });
      return;
    }
    const data = (await res.json()) as ClientSettings;
    setName(data.name);
    setDomain(data.domain ?? "");
    setReportFrequency(data.settings?.reportFrequency ?? "monthly");
    setShareWithClient(data.settings?.shareWithClient ?? false);
    setEmailReports(data.settings?.emailReports ?? false);
    setLoading(false);
  }, [clientId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/agency/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        domain: domain.trim() || null,
        reportFrequency,
        shareWithClient,
        emailReports,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      toast({ title: "Failed to save settings", variant: "destructive" });
      return;
    }

    toast({ title: "Client settings saved" });
    void load();
  };

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
        href={`/agency/clients/${clientId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to client
      </Link>

      <div>
        <h1 className="text-3xl font-bold">Client Settings</h1>
        <p className="text-muted-foreground">Configure workspace and reporting for this client</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Client name and primary domain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name">Client name</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-domain">Primary domain</Label>
            <Input
              id="client-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reporting</CardTitle>
          <CardDescription>
            Scheduled reports and client portal access — branding overrides live on the{" "}
            <Link href={`/agency/clients/${clientId}/report`} className="text-primary underline">
              report page
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Report frequency</Label>
            <Select value={reportFrequency} onValueChange={setReportFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Share with client</p>
              <p className="text-xs text-muted-foreground">
                Allow client portal access to audit summaries
              </p>
            </div>
            <Switch checked={shareWithClient} onCheckedChange={setShareWithClient} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Email reports</p>
              <p className="text-xs text-muted-foreground">
                Send scheduled PDF reports when enabled
              </p>
            </div>
            <Switch checked={emailReports} onCheckedChange={setEmailReports} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save()} disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save settings
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/agency/clients/${clientId}/portal`}>Client portal</Link>
        </Button>
      </div>
    </div>
  );
}
