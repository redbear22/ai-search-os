"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
  FileText,
  FolderKanban,
  Keyboard,
  Mail,
  Search,
  Target,
  Video,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

const SUPPORT_EMAIL = "support@ai-search-os.com";
const HELP_FEEDBACK_KEY = "help-page-feedback";

const QUICK_START_PDF_LINES = [
  "Run your first audit — enter brand and domain on the Audit page.",
  "Review detected gaps — open Gaps and click Generate Fix on priorities.",
  "Turn gaps into tasks — create a folder in Tasks and Suggest from Gaps.",
  "Add to your action plan — accept fixes and assign due weeks (1–12).",
  "Share with leadership — export Executive Summary as PDF.",
];

const QUICK_START_STEPS: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
}[] = [
  {
    icon: Search,
    title: "Run your first audit",
    description: (
      <>
        Go to{" "}
        <Link href="/audit" className="text-primary underline-offset-4 hover:underline">
          Audit
        </Link>
        , enter your brand and domain, then click &quot;Run Full AI Search Audit&quot; to score
        all four layers.
      </>
    ),
  },
  {
    icon: Target,
    title: "Review detected gaps",
    description: (
      <>
        Open{" "}
        <Link href="/gaps" className="text-primary underline-offset-4 hover:underline">
          Gaps
        </Link>{" "}
        to see where competitors are winning. Critical gaps are highlighted first — click
        &quot;Generate Fix&quot; on any item.
      </>
    ),
  },
  {
    icon: FolderKanban,
    title: "Turn gaps into tasks",
    description: (
      <>
        Use{" "}
        <Link href="/tasks" className="text-primary underline-offset-4 hover:underline">
          Tasks
        </Link>{" "}
        to create a project folder and click &quot;Suggest from Gaps&quot; for auto-generated
        checklists with priorities and owners.
      </>
    ),
  },
  {
    icon: ClipboardList,
    title: "Add to your action plan",
    description: (
      <>
        Accept a generated fix and add it to the{" "}
        <Link href="/action-plan" className="text-primary underline-offset-4 hover:underline">
          Action Plan
        </Link>
        . Drag cards between layers and assign due weeks (1–12).
      </>
    ),
  },
  {
    icon: FileText,
    title: "Share with leadership",
    description: (
      <>
        Generate a PDF from{" "}
        <Link
          href="/executive-summary"
          className="text-primary underline-offset-4 hover:underline"
        >
          Executive Summary
        </Link>{" "}
        and present visibility scores, gaps, and your 90-day plan to stakeholders.
      </>
    ),
  },
];


const FAQ_ITEMS = [
  {
    question: "What AI platforms does AI Search OS support?",
    answer:
      "ChatGPT (OpenAI), Perplexity, Claude (Anthropic), and Gemini (Google). The Clarity layer runs the same prompts across all four so you can compare accuracy side by side.",
  },
  {
    question: "Do I need API keys to get started?",
    answer:
      "No — core workflows run with rules-only fallbacks when keys are missing. Live Clarity queries need provider keys; optional integrations include DataForSEO, Keywords Everywhere, and Google Knowledge Graph.",
  },
  {
    question: "How often should I run audits?",
    answer:
      "Weekly during active optimization, monthly for monitoring. Enable the Citation Monitor cron for automated weekly checks, and use Monthly Check-in to track share-of-voice trends.",
  },
  {
    question: "Where is my audit data stored?",
    answer:
      "Progress, gaps, and action plans persist in your browser by default. Authenticated deployments can use a hosted database (DATABASE_URL). One site = one database — credentials never cross sites.",
  },
  {
    question: "Can I push fixes to other tools?",
    answer:
      "Yes. Accepted fixes can queue to the Citation Engine and Agent API for outreach. Enterprise plans support SSO, team collaboration, and webhook integrations with Zapier or Make.",
  },
];

function StepRow({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-11 sm:w-11">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold">{title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <h4 className="font-semibold">{question}</h4>
      <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
    </div>
  );
}

function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </kbd>
  );
}

async function downloadQuickStartPdf() {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const margin = 14;
  let y = 20;

  doc.setFontSize(18);
  doc.text("AI Search OS — Quick Start Guide", margin, y);
  y += 12;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Five steps · about 5 minutes", margin, y);
  y += 10;
  doc.setTextColor(0);

  const steps = QUICK_START_PDF_LINES.map((line, i) => `${i + 1}. ${line}`);

  doc.setFontSize(11);
  for (const step of steps) {
    const lines = doc.splitTextToSize(step, 180);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 4;
  }

  y += 4;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Support: ${SUPPORT_EMAIL}`, margin, y);

  doc.save("ai-search-os-quick-start.pdf");
}

export default function HelpPage() {
  const [emailCopied, setEmailCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(HELP_FEEDBACK_KEY);
    if (stored === "up" || stored === "down") setFeedback(stored);
  }, []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setEmailCopied(true);
      toast.success("Email copied!");
      setTimeout(() => setEmailCopied(false), 2000);
    } catch {
      toast.error("Could not copy email");
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadQuickStartPdf();
      toast.success("Quick Start PDF downloaded");
    } catch {
      toast.error("Could not generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleFeedback = (value: "up" | "down") => {
    setFeedback(value);
    localStorage.setItem(HELP_FEEDBACK_KEY, value);
    toast.success("Thank you for your feedback!");
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 animate-fade-in sm:space-y-8 sm:p-6 sm:py-8">
      <div className="text-center">
        <div className="mb-2 flex justify-center">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Help Center</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          New to AI Search OS? Start here.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Need help from our team?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enterprise support · onboarding · integration questions
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => void copyEmail()}
                >
                  {emailCopied ? (
                    <Check className="mr-1 h-3 w-3" />
                  ) : (
                    <Copy className="mr-1 h-3 w-3" />
                  )}
                  Copy
                </Button>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <Button asChild className="w-full shrink-0 sm:w-auto">
              <a href={`mailto:${SUPPORT_EMAIL}`}>
                <Mail className="mr-2 h-4 w-4" />
                Email support
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={downloadingPdf}
              onClick={() => void handleDownloadPdf()}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloadingPdf ? "Generating…" : "Download Quick Start PDF"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setDemoOpen(true)}
            >
              <Video className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Demo video</DialogTitle>
            <DialogDescription>
              Demo video coming soon. Check back in a few days.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" className="w-full sm:w-auto" onClick={() => setDemoOpen(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="guide" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="guide" className="text-xs sm:text-sm">
            Quick Start
          </TabsTrigger>
          <TabsTrigger value="faq" className="text-xs sm:text-sm">
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guide" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Start Guide</CardTitle>
                <CardDescription>Five steps · about 5 minutes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {QUICK_START_STEPS.map((step) => (
                  <StepRow key={step.title} icon={step.icon} title={step.title}>
                    {step.description}
                  </StepRow>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Golden path</CardTitle>
                <CardDescription>Recommended workflow after your first audit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Audit</strong> →{" "}
                  <strong className="text-foreground">Gaps</strong> → generate fixes →{" "}
                  <strong className="text-foreground">Tasks</strong> or{" "}
                  <strong className="text-foreground">Action Plan</strong> →{" "}
                  <strong className="text-foreground">Executive Summary</strong> for leadership.
                </p>
                <p>
                  Reuse GSC, SERP, and citation data in one pipeline. Rules-first fallbacks keep
                  every step working offline when API keys are not configured.
                </p>
                <p>
                  Review every AI-generated fix before publishing — strategy updates gap reasoning;
                  live pushes stay opt-in (HITL by default).
                </p>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/audit">Start your first audit</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Common questions from new users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
                {FAQ_ITEMS.map((item) => (
                  <FaqItem key={item.question} question={item.question} answer={item.answer} />
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Still stuck? Our team typically responds within one business day.
                </p>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <a href={`mailto:${SUPPORT_EMAIL}`}>Contact {SUPPORT_EMAIL}</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between p-6 text-left"
          onClick={() => setShortcutsOpen((open) => !open)}
          aria-expanded={shortcutsOpen}
        >
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Keyboard shortcuts</CardTitle>
              <CardDescription className="mt-0.5">
                Navigate faster from anywhere in the app
              </CardDescription>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
              shortcutsOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {shortcutsOpen && (
          <CardContent className="border-t pt-0">
            <ul className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
              <li className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-sm text-muted-foreground">
                  Search <span className="text-xs">(coming soon)</span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <ShortcutKey>Cmd</ShortcutKey>
                  <span className="text-xs text-muted-foreground">+</span>
                  <ShortcutKey>K</ShortcutKey>
                  <span className="text-xs text-muted-foreground">/</span>
                  <ShortcutKey>Ctrl</ShortcutKey>
                  <span className="text-xs text-muted-foreground">+</span>
                  <ShortcutKey>K</ShortcutKey>
                </div>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-sm text-muted-foreground">Go to Audit</span>
                <div className="flex shrink-0 items-center gap-1">
                  <ShortcutKey>G</ShortcutKey>
                  <span className="text-xs text-muted-foreground">then</span>
                  <ShortcutKey>A</ShortcutKey>
                </div>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-sm text-muted-foreground">Go to Gaps</span>
                <div className="flex shrink-0 items-center gap-1">
                  <ShortcutKey>G</ShortcutKey>
                  <span className="text-xs text-muted-foreground">then</span>
                  <ShortcutKey>G</ShortcutKey>
                </div>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-sm text-muted-foreground">Go to Action Plan</span>
                <div className="flex shrink-0 items-center gap-1">
                  <ShortcutKey>G</ShortcutKey>
                  <span className="text-xs text-muted-foreground">then</span>
                  <ShortcutKey>P</ShortcutKey>
                </div>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-sm text-muted-foreground">Go to Tasks</span>
                <div className="flex shrink-0 items-center gap-1">
                  <ShortcutKey>G</ShortcutKey>
                  <span className="text-xs text-muted-foreground">then</span>
                  <ShortcutKey>T</ShortcutKey>
                </div>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2 sm:col-span-2">
                <span className="text-sm text-muted-foreground">Show this help menu</span>
                <ShortcutKey>?</ShortcutKey>
              </li>
            </ul>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-center">
          <span className="text-sm text-muted-foreground">Was this helpful?</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={feedback === "up" ? "default" : "outline"}
              size="sm"
              className="h-9 px-3"
              onClick={() => handleFeedback("up")}
              aria-pressed={feedback === "up"}
            >
              👍
            </Button>
            <Button
              type="button"
              variant={feedback === "down" ? "default" : "outline"}
              size="sm"
              className="h-9 px-3"
              onClick={() => handleFeedback("down")}
              aria-pressed={feedback === "down"}
            >
              👎
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
