"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Copy, Eye, EyeOff, Link as LinkIcon } from "lucide-react";

type ClientPortal = {
  id: string;
  clientId: string;
  enabled: boolean;
  accessKey: string;
  portalUrl: string;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    customDomain?: string;
  };
};

export default function ClientPortalPage() {
  const params = useParams();
  const clientId = (params?.clientId as string) ?? "";
  const { toast } = useToast();
  const [client, setClient] = useState<ClientPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetchPortal();
  }, [clientId]);

  const fetchPortal = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/portal`);
      if (res.ok) {
        const data = await res.json();
        setClient(data);
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to load portal settings");
      }
    } catch (error) {
      console.error("Failed to fetch portal:", error);
      setError("Failed to load portal settings");
    } finally {
      setLoading(false);
    }
  };

  const togglePortal = async (enabled: boolean) => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/portal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (res.ok) {
        setClient((prev) => (prev ? { ...prev, enabled } : null));
        toast({
          title: enabled ? "Portal enabled" : "Portal disabled",
          description: enabled
            ? "Client portal is now accessible"
            : "Client portal has been disabled",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update portal settings",
        variant: "destructive",
      });
    }
  };

  const regenerateKey = async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/portal/regenerate-key`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setClient((prev) => (prev ? { ...prev, accessKey: data.accessKey, portalUrl: data.portalUrl } : null));
        toast({
          title: "Access key regenerated",
          description: "The old key is no longer valid",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate access key",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
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
        <p className="text-muted-foreground">{error ?? "Portal not configured"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Client Portal</h1>
        <p className="text-muted-foreground mt-2">
          Manage client access and portal settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portal Access</CardTitle>
          <CardDescription>Enable or disable client portal access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Portal Status</Label>
              <p className="text-sm text-muted-foreground">
                {client.enabled
                  ? "Portal is accessible to the client"
                  : "Portal is currently disabled"}
              </p>
            </div>
            <Switch checked={client.enabled} onCheckedChange={togglePortal} />
          </div>

          {client.enabled && (
            <>
              <div className="space-y-2">
                <Label>Portal URL</Label>
                <div className="flex gap-2">
                  <Input value={client.portalUrl} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(client.portalUrl, "Portal URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(client.portalUrl, "_blank")}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Access Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={client.accessKey}
                    type={showKey ? "text" : "password"}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(client.accessKey, "Access key")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this key with your client for portal access
                </p>
              </div>

              <Button variant="destructive" onClick={regenerateKey}>
                Regenerate Access Key
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>White Label Settings</CardTitle>
          <CardDescription>Customize portal branding</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Branding customization coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}