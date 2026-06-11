"use client";

import { Button } from "@/components/ui/button";

export function ResetOnboardingButton() {
  return (
    <Button
      variant="outline"
      onClick={() => {
        const reset = (window as Window & { resetOnboarding?: () => void }).resetOnboarding;
        if (reset) {
          reset();
          return;
        }
        localStorage.removeItem("onboarding_completed");
        localStorage.removeItem("welcome_shown");
        window.location.reload();
      }}
    >
      Reset Onboarding Tour
    </Button>
  );
}
