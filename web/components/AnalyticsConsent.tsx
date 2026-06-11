"use client";

import { useEffect, useState } from "react";
import { BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ANALYTICS_CONSENT_KEY, ANALYTICS_ENABLED_KEY } from "@/lib/analytics";

const ANALYTICS_FEATURE_ENABLED =
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

export function AnalyticsConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ANALYTICS_FEATURE_ENABLED) return;

    const consented = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (consented === null) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, "true");
    localStorage.setItem(ANALYTICS_ENABLED_KEY, "true");
    setVisible(false);
    window.location.reload();
  };

  const decline = () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, "false");
    localStorage.setItem(ANALYTICS_ENABLED_KEY, "false");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <BarChart3 className="mt-0.5 h-5 w-5 text-blue-500" />
              <div>
                <h4 className="text-sm font-semibold">Help improve AI Search OS</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Anonymously share audit patterns to train better AI fixes. No personal
                  data, no API keys, no brand names.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={decline}
              className="h-6 w-6 p-0"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={accept}>
              Yes, help improve
            </Button>
            <Button size="sm" variant="outline" onClick={decline}>
              No thanks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
