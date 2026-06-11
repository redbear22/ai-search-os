"use client";

import { useAuditStore } from "@/store/auditStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

export function TrustLayer() {
  const { trust, setTrust } = useAuditStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trust layer</CardTitle>
        <CardDescription>Sentiment, reviews, and hedged-language signals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Sentiment score</Label>
            <span className="text-sm font-medium tabular-nums">{trust.sentimentScore.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[trust.sentimentScore]}
            onValueChange={([v]) => setTrust({ sentimentScore: v })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reviewCount">Review count</Label>
            <Input
              id="reviewCount"
              type="number"
              value={trust.reviewCount}
              onChange={(e) => setTrust({ reviewCount: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avgRating">Average rating (0–5)</Label>
            <Input
              id="avgRating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={trust.averageRating}
              onChange={(e) => setTrust({ averageRating: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border p-4">
          <Checkbox
            id="hedged"
            checked={trust.hedgedLanguageDetected}
            onCheckedChange={(checked) =>
              setTrust({ hedgedLanguageDetected: checked === true })
            }
          />
          <div className="space-y-0.5">
            <Label htmlFor="hedged" className="cursor-pointer">
              Hedged language detected
            </Label>
            <p className="text-xs text-muted-foreground">
              AI answers use qualifiers like &quot;may&quot;, &quot;could&quot;, or &quot;some users report&quot;
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
