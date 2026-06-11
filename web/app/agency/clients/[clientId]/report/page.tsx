"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { exportWhiteLabelReportPdf } from "@/lib/white-label-report";
import type { ReportFrequency, WhiteLabelReportData } from "@/types/white-label-report";

export default function ClientReportPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? "";
  const { toast } = useToast();

  const [report, setReport] = useState<WhiteLabelReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#3b82f6");
  const [reportFooterText, setReportFooterText] = useState("");
  const [inheritsFromAgency, setInheritsFromAgency] = useState(true);
  const [emailReports, setEmailReports] = useState(false);
  const [reportFrequency, setReportFrequency] = useState<ReportFrequency>("monthly");

  const loadReport = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agency/clients/${clientId}/report`);
    if (!res.ok) {
      setLoading(false);
      toast({ title: "Failed to load report", variant: "destructive" });
      return;
    }
    const data = (await res.json()) as WhiteLabelReportData;
    setReport(data);
    setAgencyLogo(data.branding.agencyLogo);
    setBrandColor(data.branding.brandColor);
    setReportFooterText(data.branding.reportFooterText ?? "");
    setInheritsFromAgency(data.branding.inheritsFromAgency ?? false);
    setEmailReports(data.settings.emailReports);
    setReportFrequency(data.settings.reportFrequency);
    setLoading(false);
  }, [clientId, toast]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      toast({ title: "Logo must be under 500KB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAgencyLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {
    setSaving(true);
    const res = await fetch(`/api/agency/clients/${clientId}/report`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agencyLogo,
        brandColor,
        reportFooterText: reportFooterText || null,
        emailReports,
        reportFrequency,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: "Failed to save settings", variant: "destructive" });
      return;
    }
    toast({ title: "Report settings saved" });
    void loadReport();
  };

  const handleExportPdf = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const branded: WhiteLabelReportData = {
        ...report,
        branding: {
          ...report.branding,
          agencyLogo,
          brandColor,
          reportFooterText: reportFooterText || null,
          secondaryColor: report.branding.secondaryColor,
          fontFamily: report.branding.fontFamily,
          reportHeader: report.branding.reportHeader,
        },
      };
      await exportWhiteLabelReportPdf(branded);
      toast({ title: "PDF downloaded" });
    } catch {
      toast({ title: "PDF export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto py-16 text-center">
        <p className="text-muted-foreground">Report unavailable</p>
      </div>
    );
  }

  const logoPreview = agencyLogo ?? report.branding.agencyLogoFallback;

  return (
    <div className="container mx-auto space-y-6 py-8">
      <Link
        href={`/agency/clients/${clientId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to client
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">White-Label Report</h1>
          <p className="text-muted-foreground">
            Branded PDF reports for {report.client.name}
          </p>
        </div>
        <Button onClick={handleExportPdf} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export PDF
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Branding & Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-md border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
              Logo, color, and footer inherit from{" "}
              <Link href="/agency/branding" className="font-medium underline">
                agency branding
              </Link>
              . Override below only when this client needs different branding.
            </p>

            <div className="space-y-2">
              <Label htmlFor="logo">Agency logo override</Label>
              <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} />
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo preview" className="h-10 object-contain" />
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandColor">Brand color override</Label>
              <div className="flex gap-2">
                <Input
                  id="brandColor"
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer">Report footer override</Label>
              <Textarea
                id="footer"
                value={reportFooterText}
                onChange={(e) => setReportFooterText(e.target.value)}
                placeholder={`Prepared by ${report.branding.agencyName}`}
                rows={2}
              />
            </div>

            {inheritsFromAgency ? (
              <p className="text-xs text-muted-foreground">
                Currently using agency defaults (no client overrides saved).
              </p>
            ) : null}

            <div className="space-y-2">
              <Label>Report frequency</Label>
              <Select
                value={reportFrequency}
                onValueChange={(v) => setReportFrequency(v as ReportFrequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="emailReports"
                checked={emailReports}
                onCheckedChange={(checked) => setEmailReports(checked === true)}
              />
              <Label htmlFor="emailReports" className="font-normal">
                Schedule recurring email reports
              </Label>
            </div>

            {emailReports && report.settings.nextReportAt ? (
              <p className="text-sm text-muted-foreground">
                Next scheduled report:{" "}
                {new Date(report.settings.nextReportAt).toLocaleDateString()}
              </p>
            ) : null}

            <Button onClick={saveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            className="border-b"
            style={{ borderBottomColor: brandColor, backgroundColor: `${brandColor}10` }}
          >
            <div className="flex items-center justify-between">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="" className="h-8 object-contain" />
              ) : (
                <span className="font-semibold" style={{ color: brandColor }}>
                  {report.branding.agencyName}
                </span>
              )}
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <h2 className="text-xl font-bold">{report.client.name}</h2>
              <p className="text-sm text-muted-foreground">
                {report.branding.reportHeader?.trim() || "AI Visibility Report"}
              </p>
              {report.client.domain ? (
                <p className="text-xs text-muted-foreground">{report.client.domain}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                ["Share of Voice", `${report.metrics.shareOfVoice}%`],
                ["Open Gaps", String(report.metrics.gapCount)],
                ["Actions Done", String(report.metrics.completedActions)],
                ["Improvement", `+${report.metrics.improvement}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold" style={{ color: brandColor }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Layer scores</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Discoverability", report.metrics.discoverability],
                  ["Clarity", report.metrics.clarity],
                  ["Authority", report.metrics.authority],
                  ["Trust", report.metrics.trust],
                ].map(([label, score]) => (
                  <div key={label} className="flex justify-between rounded border px-3 py-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{score}%</span>
                  </div>
                ))}
              </div>
            </div>

            {report.topGaps.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">Priority gaps</p>
                <ul className="space-y-2 text-sm">
                  {report.topGaps.map((gap, i) => (
                    <li key={i} className="rounded border px-3 py-2">
                      <span className="font-medium">{gap.title}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {gap.layer} · {gap.severity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="border-t pt-4 text-xs text-muted-foreground">
              {reportFooterText ||
                `Prepared by ${report.branding.agencyName} · Powered by AI Search Rank`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
