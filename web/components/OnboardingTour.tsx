"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

const STORAGE_KEY = "onboarding_completed";
const WELCOME_KEY = "welcome_shown";

const tourSteps: DriveStep[] = [
  {
    element: "#nav-audit",
    popover: {
      title: "Click Audit to start",
      description:
        "Analyze your brand across 4 layers: Discoverability, Clarity, Authority, and Trust.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#audit-brand-input",
    popover: {
      title: "Enter your brand",
      description: "Add your brand name, domain, and competitors.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#run-audit-button",
    popover: {
      title: "Run the audit",
      description:
        'Click "Run Full AI Search Audit" — queries ChatGPT, Perplexity, Claude, Gemini, and SEO tools (~10 seconds).',
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#nav-gaps",
    popover: {
      title: "Review gaps",
      description:
        "After your audit, see detected opportunities sorted by severity (Critical → Low).",
      side: "right",
      align: "start",
    },
  },
  {
    element: ".gap-card:first-child",
    popover: {
      title: "Generate AI fixes",
      description:
        'Click "Generate Fix" on any gap for an action plan, pitch email, metrics, and resources.',
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#nav-action-plan",
    popover: {
      title: "Build action plan",
      description: "Add fixes here. Drag cards between columns and track progress over 90 days.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#nav-executive-summary",
    popover: {
      title: "Share with leadership",
      description: "One-page summary with KPIs, top actions, and resource asks. Export to PDF.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#nav-check-in",
    popover: {
      title: "Track progress",
      description: "Save monthly snapshots and watch Share of Voice and KPI trends over time.",
      side: "right",
      align: "start",
    },
  },
];

function waitForElement(selector: string, timeoutMs = 8000): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const started = Date.now();
    const interval = window.setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        window.clearInterval(interval);
        resolve(el);
      } else if (Date.now() - started >= timeoutMs) {
        window.clearInterval(interval);
        resolve(null);
      }
    }, 100);
  });
}

export function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { status } = useSession();
  const [tourCompleted, setTourCompleted] = useState(true);
  const driverRef = useRef<Driver | null>(null);
  const skipMarkOnDestroyRef = useRef(false);

  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth");

  const markComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setTourCompleted(true);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(WELCOME_KEY);
    setTourCompleted(false);
    window.location.reload();
  }, []);

  const startTour = useCallback(() => {
    if (tourCompleted || isAuthPage) return;

    if (driverRef.current) {
      driverRef.current.drive();
      return;
    }

    const stepsWithNavigation: DriveStep[] = tourSteps.map((step, index) => {
      const popover = { ...step.popover };

      if (index === 0) {
        popover.onNextClick = async (_el, _s, { driver: driverInstance }) => {
          router.push("/audit");
          await waitForElement("#audit-brand-input");
          driverInstance.moveNext();
        };
      }

      if (index === 3) {
        popover.onNextClick = async (_el, _s, { driver: driverInstance }) => {
          router.push("/gaps");
          await waitForElement(".gap-card");
          driverInstance.moveNext();
        };
      }

      return { ...step, popover };
    });

    const driverInstance = driver({
      allowClose: true,
      showProgress: true,
      progressText: "Step {{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      smoothScroll: true,
      steps: stepsWithNavigation,
      onHighlighted: (element) => {
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
      onPopoverRender: (popover, { driver: activeDriver }) => {
        if (popover.footerButtons.querySelector("[data-onboarding-skip]")) return;

        const skipBtn = document.createElement("button");
        skipBtn.type = "button";
        skipBtn.textContent = "Skip tour";
        skipBtn.className = "driver-popover-prev-btn";
        skipBtn.setAttribute("data-onboarding-skip", "true");
        skipBtn.addEventListener("click", () => {
          markComplete();
          activeDriver.destroy();
        });
        popover.footerButtons.prepend(skipBtn);
      },
      onDestroyed: () => {
        if (!skipMarkOnDestroyRef.current) {
          markComplete();
        }
        driverRef.current = null;
      },
    });

    driverRef.current = driverInstance;
    driverInstance.drive();
  }, [isAuthPage, tourCompleted, router, markComplete]);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY) === "true";
    setTourCompleted(completed);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as Window & {
        resetOnboarding?: () => void;
        startOnboarding?: () => void;
      };
      win.resetOnboarding = resetTour;
      win.startOnboarding = startTour;
    }
  }, [resetTour, startTour]);

  useEffect(() => {
    if (isAuthPage) return;
    if (status !== "authenticated") return;
    if (tourCompleted) return;

    const hasSeenWelcome = localStorage.getItem(WELCOME_KEY);
    if (hasSeenWelcome) return;

    localStorage.setItem(WELCOME_KEY, "true");

    const timer = window.setTimeout(() => {
      toast.success("Welcome to AI Search OS! 🎉", {
        description: "Take the quick tour to learn the ropes →",
        duration: 8000,
        action: {
          label: "Start Tour",
          onClick: () => startTour(),
        },
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isAuthPage, status, tourCompleted, startTour]);

  useEffect(() => {
    return () => {
      if (driverRef.current) {
        skipMarkOnDestroyRef.current = true;
        driverRef.current.destroy();
        skipMarkOnDestroyRef.current = false;
      }
    };
  }, []);

  return null;
}
