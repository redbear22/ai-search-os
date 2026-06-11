"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Copy, Key, Loader2, Plus, Trash2, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { WebhookEventType } from "@/types/api-v1";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type WebhookRow = {
  id: string;
  url: string;
  events: WebhookEventType[];
  enabled: boolean;
  createdAt: string;
};

type OAuthClientRow = {
  id: string;
  clientId: string;
  name: string;
  redirectUris: string[];
  scopes: string[];
  createdAt: string;
};

const WEBHOOK_EVENTS: WebhookEventType[] = [
  "audit.completed",
  "gap.detected",
  "fix.generated",
  "client.health.changed",
];

const ENDPOINTS = [
  { method: "GET", path: "/api/v1/clients", desc: "List agency clients" },
  { method: "POST", path: "/api/v1/clients", desc: "Create client" },
  { method: "GET", path: "/api/v1/clients/{id}/audits", desc: "Audit history" },
  { method: "POST", path: "/api/v1/clients/{id}/audits", desc: "Trigger audit (async)" },
  { method: "POST", path: "/api/v1/clients/{id}/reports", desc: "Generate report" },
  { method: "GET", path: "/api/v1/benchmarks", desc: "Industry benchmarks" },
  { method: "GET", path: "/api/v1/predictions", desc: "AI predictions (?clientId=)" },
  { method: "POST", path: "/api/v1/webhooks", desc: "Configure webhook" },
  { method: "GET", path: "/api/v1/webhooks", desc: "List webhooks" },
  { method: "POST", path: "/api/v1/automation/schedule", desc: "Schedule recurring audits" },
  { method: "GET", path: "/api/v1/automation/status", desc: "Automation health" },
  { method: "DELETE", path: "/api/v1/automation/runs", desc: "Cancel run (?runId=)" },
];

export default function AgencyApiSettingsPage() {
  const { status } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [enterprise, setEnterprise] = useState(false);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [oauthClients, setOauthClients] = useState<OAuthClientRow[]>([]);

  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventType[]>([
    "audit.completed",
  ]);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  const [oauthName, setOauthName] = useState("");
  const [creatingOAuth, setCreatingOAuth] = useState(false);
  const [newOAuthCreds, setNewOAuthCreds] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    const settingsRes = await fetch("/api/agency/settings");
    if (!settingsRes.ok) {
      setLoading(false);
      return;
    }

    const agency = (await settingsRes.json()) as {
      subscription?: { plan?: string } | null;
    };
    const isEnterprise = agency.subscription?.plan === "ENTERPRISE";
    setEnterprise(isEnterprise);

    if (isEnterprise) {
      const [keysRes, hooksRes, oauthRes] = await Promise.all([
        fetch("/api/v1/keys"),
        fetch("/api/agency/settings/api/webhooks"),
        fetch("/api/v1/oauth/clients"),
      ]);

      if (keysRes.ok) {
        const data = (await keysRes.json()) as { data: ApiKeyRow[] };
        setKeys(data.data ?? []);
      }

      if (hooksRes.ok) {
        setWebhooks((await hooksRes.json()) as WebhookRow[]);
      }

      if (oauthRes.ok) {
        const data = (await oauthRes.json()) as { data: OAuthClientRow[] };
        setOauthClients(data.data ?? []);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") void loadData();
  }, [status, loadData]);

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingKey(true);
    const res = await fetch("/api/v1/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName }),
    });
    setCreatingKey(false);
    if (!res.ok) {
      toast({ title: "Failed to create API key", variant: "destructive" });
      return;
    }
    const data = (await res.json()) as { data: { apiKey: string } };
    setNewKeyPlaintext(data.data.apiKey);
    setKeyName("");
    void loadData();
    toast({ title: "API key created" });
  };

  const revokeKey = async (id: string) => {
    const res = await fetch(`/api/v1/keys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Failed to revoke key", variant: "destructive" });
      return;
    }
    void loadData();
    toast({ title: "API key revoked" });
  };

  const createOAuthClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingOAuth(true);
    const res = await fetch("/api/v1/oauth/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: oauthName || "OAuth Client" }),
    });
    setCreatingOAuth(false);
    if (!res.ok) {
      toast({ title: "Failed to register OAuth client", variant: "destructive" });
      return;
    }
    const data = (await res.json()) as {
      data: { clientId: string; clientSecret: string };
    };
    setNewOAuthCreds({
      clientId: data.data.clientId,
      clientSecret: data.data.clientSecret,
    });
    setOauthName("");
    void loadData();
  };

  const copyText = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (loading) {
    return (
      <div className="container mx-auto flex max-w-4xl items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!enterprise) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Link
          href="/agency/settings"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Enterprise API</CardTitle>
            <CardDescription>
              API v1 is available on the Enterprise plan. Upgrade to automate audits,
              integrate with your stack, and receive webhook notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/agency/settings">View Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-8">
      <Link
        href="/agency/settings"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Settings
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Enterprise API</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage API keys, webhooks, and OAuth clients. OpenAPI spec at{" "}
          <a href="/api/v1/openapi.json" className="underline" target="_blank" rel="noreferrer">
            /api/v1/openapi.json
          </a>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Use Authorization: Bearer aiso_… or X-API-Key header. Rate limit: 1000 req/min.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newKeyPlaintext && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
              <p className="font-medium">New key (copy now — shown once):</p>
              <code className="mt-1 block break-all">{newKeyPlaintext}</code>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => copyText(newKeyPlaintext)}
              >
                <Copy className="mr-1 h-3 w-3" />
                Copy
              </Button>
            </div>
          )}

          <form onSubmit={createKey} className="flex gap-2">
            <Input
              placeholder="Key name (e.g. Production)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              required
            />
            <Button type="submit" disabled={creatingKey}>
              {creatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </form>

          <ul className="divide-y rounded-md border">
            {keys.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">No API keys yet.</li>
            )}
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {k.keyPrefix}… · Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => revokeKey(k.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Configure via POST /api/v1/webhooks with your API key, or use the form below after
            creating a key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Events: {WEBHOOK_EVENTS.join(", ")}. Signed with HMAC-SHA256 (X-AISO-Signature header).
          </p>

          {newWebhookSecret && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
              <p className="font-medium">Webhook secret (copy now):</p>
              <code className="block break-all">{newWebhookSecret}</code>
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setCreatingWebhook(true);
              const res = await fetch("/api/agency/settings/api/webhooks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: webhookUrl, events: webhookEvents }),
              });
              setCreatingWebhook(false);
              if (!res.ok) {
                toast({ title: "Failed to create webhook", variant: "destructive" });
                return;
              }
              const data = (await res.json()) as { secret: string };
              setNewWebhookSecret(data.secret);
              setWebhookUrl("");
              void loadData();
              toast({ title: "Webhook created" });
            }}
            className="space-y-3"
          >
            <Input
              placeholder="https://example.com/webhooks/aiso"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              required
            />
            <div className="flex flex-wrap gap-3">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={webhookEvents.includes(ev)}
                    onCheckedChange={(checked) => {
                      setWebhookEvents((prev) =>
                        checked ? [...prev, ev] : prev.filter((x) => x !== ev)
                      );
                    }}
                  />
                  {ev}
                </label>
              ))}
            </div>
            <Button type="submit" disabled={creatingWebhook || webhookEvents.length === 0}>
              {creatingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add webhook"}
            </Button>
          </form>

          {webhooks.length > 0 && (
            <ul className="mt-4 divide-y rounded-md border">
              {webhooks.map((wh) => (
                <li key={wh.id} className="p-3 text-sm">
                  <p className="font-medium">{wh.url}</p>
                  <p className="text-xs text-muted-foreground">{wh.events.join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OAuth2 (client_credentials stub)</CardTitle>
          <CardDescription>
            POST /api/v1/oauth/token with client_id and client_secret for Bearer tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newOAuthCreds && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
              <p className="font-medium">Credentials (copy now):</p>
              <p>client_id: <code>{newOAuthCreds.clientId}</code></p>
              <p>client_secret: <code className="break-all">{newOAuthCreds.clientSecret}</code></p>
            </div>
          )}
          <form onSubmit={createOAuthClient} className="flex gap-2">
            <Input
              placeholder="Client name"
              value={oauthName}
              onChange={(e) => setOauthName(e.target.value)}
            />
            <Button type="submit" disabled={creatingOAuth}>
              Register
            </Button>
          </form>
          <ul className="divide-y rounded-md border">
            {oauthClients.map((c) => (
              <li key={c.id} className="p-3 text-sm">
                <p className="font-medium">{c.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{c.clientId}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4">Method</th>
                  <th className="pb-2 pr-4">Path</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((ep) => (
                  <tr key={ep.path + ep.method} className="border-b">
                    <td className="py-2 pr-4">
                      <Badge variant="outline">{ep.method}</Badge>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{ep.path}</td>
                    <td className="py-2 text-muted-foreground">{ep.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
