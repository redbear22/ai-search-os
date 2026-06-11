"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { FullAuditButton } from "@/components/audit/FullAuditButton";
import { useAuditStore } from "@/store/auditStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UnifiedAuditPanel() {
  const savedBrand = useAuditStore((s) => s.auditBrandName);
  const savedDomain = useAuditStore((s) => s.auditDomain);

  const [brandName, setBrandName] = useState(savedBrand || "PickAdviser");
  const [domain, setDomain] = useState(savedDomain || "pickadviser.org");
  const [competitorsText, setCompetitorsText] = useState(
    "competitor1.com, competitor2.com"
  );

  const competitors = competitorsText
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <Card className="gradient-border hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Unified audit
        </CardTitle>
        <CardDescription>
          Pull live data from OpenAI, Keywords Everywhere, DataForSEO, Trends MCP, and more —
          then auto-fill all four layers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          id="audit-brand-input"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        >
          <div className="space-y-2">
            <Label htmlFor="ua-brand">Brand name</Label>
            <Input
              id="ua-brand"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="PickAdviser"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ua-domain">Domain</Label>
            <Input
              id="ua-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="pickadviser.org"
            />
          </div>
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="ua-competitors">Competitors (comma-separated)</Label>
            <Input
              id="ua-competitors"
              value={competitorsText}
              onChange={(e) => setCompetitorsText(e.target.value)}
              placeholder="competitor1.com, competitor2.com"
            />
          </div>
        </div>

        <FullAuditButton
          brandName={brandName}
          domain={domain}
          competitors={competitors}
        />
      </CardContent>
    </Card>
  );
}
