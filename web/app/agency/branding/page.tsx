"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Palette, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  brandingToCssVars,
  googleFontStylesheetUrl,
} from "@/lib/agency-branding";
import {
  GOOGLE_FONTS,
  type AgencyBranding,
  type AgencyBrandingFeatures,
} from "@/types/agency-branding";

export default function AgencyBrandingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);
  const [branding, setBranding] = useState<AgencyBranding | null>(null);

  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#64748b");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [customDomain, setCustomDomain] = useState("");
  const [portalName, setPortalName] = useState("");
  const [reportHeader, setReportHeader] = useState("");
  const [reportFooter, setReportFooter] = useState("");
  const [features, setFeatures] = useState<AgencyBrandingFeatures>({
    showRecommendations: true,
    allowClientFeedback: true,
    enableChat: false,
    brandedEmails: false,
  });

  const loadBranding = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/agency/branding");
    if (!res.ok) {
      setLoading(false);
      toast({ title: "Failed to load branding", variant: "destructive" });
      return;
    }
    const data = (await res.json()) as AgencyBranding;
    setBranding(data);
    setPrimaryColor(data.primaryColor);
    setSecondaryColor(data.secondaryColor);
    setFontFamily(data.fontFamily);
    setCustomDomain(data.customDomain ?? "");
    setPortalName(data.portalName ?? "");
    setReportHeader(data.reportHeader ?? "");
    setReportFooter(data.reportFooter ?? "");
    setFeatures(data.features);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadBranding();
  }, [loadBranding]);

  useEffect(() => {
    const linkId = "agency-branding-font-preview";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = googleFontStylesheetUrl(fontFamily);
  }, [fontFamily]);

  const handleUpload = async (type: "logo" | "favicon", file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File must be 2MB or smaller", variant: "destructive" });
      return;
    }
    setUploading(type);
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);

    const res = await fetch("/api/agency/branding/upload", {
      method: "POST",
      body: formData,
    });
    setUploading(null);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast({
        title: data.error ?? "Upload failed",
        variant: "destructive",
      });
      return;
    }

    toast({ title: `${type === "logo" ? "Logo" : "Favicon"} uploaded` });
    void loadBranding();
  };

  const saveBranding = async () => {
    setSaving(true);
    const res = await fetch("/api/agency/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primaryColor,
        secondaryColor,
        fontFamily,
        customDomain: customDomain.trim() || null,
        portalName: portalName.trim() || null,
        reportHeader: reportHeader.trim() || null,
        reportFooter: reportFooter.trim() || null,
        features,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast({
        title: data.error ?? "Failed to save branding",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Branding saved" });
    void loadBranding();
  };

  const previewStyle = {
    ...brandingToCssVars({ primaryColor, secondaryColor, fontFamily }),
    fontFamily: `"${fontFamily}", system-ui, sans-serif`,
  } as React.CSSProperties;

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = portalName.trim() || branding?.agencyName || "Client Portal";

  return (
    <div className="container mx-auto space-y-6 py-8">
      <Link
        href="/agency"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Agency Dashboard
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agency Branding</h1>
          <p className="text-muted-foreground">
            White-label your client portal and reports for all clients
          </p>
        </div>
        <Button onClick={saveBranding} disabled={saving}>
          {saving ? "Saving..." : "Save branding"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Logo & Favicon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Agency logo</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  disabled={uploading === "logo"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload("logo", file);
                  }}
                />
                {branding?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logoUrl}
                    alt="Logo preview"
                    className="h-10 object-contain"
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="favicon">Favicon</Label>
                <Input
                  id="favicon"
                  type="file"
                  accept="image/*,.ico"
                  disabled={uploading === "favicon"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload("favicon", file);
                  }}
                />
                {branding?.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.faviconUrl}
                    alt="Favicon preview"
                    className="h-8 w-8 object-contain"
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Colors & Typography
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-16 cursor-pointer p-1"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-16 cursor-pointer p-1"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Google Font</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOOGLE_FONTS.map((font) => (
                      <SelectItem key={font} value={font}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p
                  className="text-sm text-muted-foreground"
                  style={{ fontFamily: `"${fontFamily}", sans-serif` }}
                >
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Domain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="customDomain">Domain</Label>
              <Input
                id="customDomain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="reports.agency.com"
              />
              <p className="text-xs text-muted-foreground">
                DNS setup required. Custom domain routing is not active yet — saved for
                future configuration.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Copy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="portalName">Portal name</Label>
                <Input
                  id="portalName"
                  value={portalName}
                  onChange={(e) => setPortalName(e.target.value)}
                  placeholder="Acme SEO Dashboard"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportHeader">Report header</Label>
                <Input
                  id="reportHeader"
                  value={reportHeader}
                  onChange={(e) => setReportHeader(e.target.value)}
                  placeholder="AI Visibility Report"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportFooter">Report footer</Label>
                <Textarea
                  id="reportFooter"
                  value={reportFooter}
                  onChange={(e) => setReportFooter(e.target.value)}
                  placeholder={`Prepared by ${branding?.agencyName ?? "Your Agency"}`}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  ["showRecommendations", "Show recommendations in portal"],
                  ["allowClientFeedback", "Allow client feedback"],
                  ["enableChat", "Enable chat support"],
                  ["brandedEmails", "Branded email reports"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={features[key]}
                    onCheckedChange={(checked) =>
                      setFeatures((prev) => ({ ...prev, [key]: checked === true }))
                    }
                  />
                  <Label htmlFor={key} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit overflow-hidden lg:sticky lg:top-8">
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="overflow-hidden rounded-lg border"
              style={previewStyle}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  backgroundColor: `color-mix(in srgb, ${primaryColor} 12%, white)`,
                  borderBottom: `2px solid ${primaryColor}`,
                }}
              >
                <div className="flex items-center gap-3">
                  {branding?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={branding.logoUrl}
                      alt=""
                      className="h-7 object-contain"
                    />
                  ) : (
                    <span
                      className="text-sm font-semibold"
                      style={{ color: primaryColor }}
                    >
                      {branding?.agencyName}
                    </span>
                  )}
                  <span className="text-sm font-medium">{displayName}</span>
                </div>
                {branding?.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.faviconUrl}
                    alt=""
                    className="h-5 w-5 object-contain"
                  />
                ) : null}
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <h2 className="text-lg font-bold">Sample Client</h2>
                  <p className="text-sm" style={{ color: secondaryColor }}>
                    Your AI visibility dashboard
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["Share of Voice", "Open Gaps"].map((label) => (
                    <div key={label} className="rounded border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p
                        className="text-lg font-bold"
                        style={{ color: primaryColor }}
                      >
                        72%
                      </p>
                    </div>
                  ))}
                </div>
                {features.showRecommendations ? (
                  <div className="rounded border p-3 text-sm">
                    <p className="font-medium">Recommendations</p>
                    <p className="text-muted-foreground">
                      Priority actions appear here when enabled.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Recommendations hidden (feature disabled)
                  </p>
                )}
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  {reportFooter.trim() ||
                    `Prepared by ${branding?.agencyName ?? "Your Agency"} · Powered by AI Search Rank`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
