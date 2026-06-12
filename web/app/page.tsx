"use client";

import { useState } from "react";
import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
import { DOMAIN_SLOT_FOOTNOTE, PRICING_PLANS } from "@/lib/pricing-plans";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Calendar,
  Check,
  CheckCircle,
  Eye,
  FileText,
  Menu,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "The Fix Engine",
    description:
      "AI-generated remediation: pitch emails, content briefs, action plans, success metrics. The only AEO platform that writes the fix, not just the diagnosis.",
    highlighted: true,
  },
  {
    icon: BarChart3,
    title: "4-Platform Audit",
    description: "ChatGPT, Perplexity, Claude, Gemini, analysed simultaneously.",
  },
  {
    icon: Eye,
    title: "Citation Intelligence",
    description: "Track where AI cites you vs. competitors.",
  },
  {
    icon: TrendingUp,
    title: "Zero-Click Metrics",
    description: "Share of Voice, mention rate, citation density.",
  },
  {
    icon: Bot,
    title: "Agent Readiness Score",
    description: "Grade your content for how well AI understands it.",
  },
  {
    icon: Calendar,
    title: "90-Day Action Plan",
    description: "Drag-and-drop roadmap with team assignment.",
  },
  {
    icon: FileText,
    title: "Executive Summary PDF",
    description: "Leadership-ready, one page, one click.",
  },
  {
    icon: CheckCircle,
    title: "Monthly Check-in",
    description: "Watch Share of Voice climb over time.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Up to 10 members, role-based access.",
  },
];

type ComparisonCell = boolean | "partial";

const comparison: { feature: string; moat?: boolean; aiSearchRank: ComparisonCell; monitoringTools: ComparisonCell; semrush: ComparisonCell }[] = [
  { feature: "4-platform simultaneous audit", aiSearchRank: true, monitoringTools: false, semrush: false },
  { feature: "AI-generated fixes", moat: true, aiSearchRank: true, monitoringTools: false, semrush: false },
  { feature: "Automated 90-day action plan", moat: true, aiSearchRank: true, monitoringTools: false, semrush: false },
  { feature: "Agent Readiness Score", aiSearchRank: true, monitoringTools: false, semrush: false },
  { feature: "Zero-click metrics dashboard", aiSearchRank: true, monitoringTools: false, semrush: false },
  { feature: "Citation intelligence", aiSearchRank: true, monitoringTools: true, semrush: false },
  { feature: "Executive summary PDF", aiSearchRank: true, monitoringTools: false, semrush: "partial" },
  { feature: "Traditional rank tracking", aiSearchRank: false, monitoringTools: false, semrush: true },
];

function ComparisonCellValue({ value }: { value: ComparisonCell }) {
  if (value === true) {
    return <Check className="mx-auto h-5 w-5 text-green-500" />;
  }
  if (value === "partial") {
    return <span className="text-sm text-gray-500">partial</span>;
  }
  return <span className="text-red-400">—</span>;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
                AI Search Rank
              </span>
            </div>

            <div className="hidden items-center space-x-6 md:flex">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="#comparison" className="text-gray-600 hover:text-gray-900">
                Comparison
              </Link>
              <Link
                href="/audit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Run Free Audit
              </Link>
              <UserMenu />
            </div>

            <button
              type="button"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-b bg-white md:hidden">
            <div className="space-y-1 px-4 py-2">
              <Link href="#features" className="block py-2 text-gray-600">
                Features
              </Link>
              <Link href="/pricing" className="block py-2 text-gray-600">
                Pricing
              </Link>
              <Link href="#comparison" className="block py-2 text-gray-600">
                Comparison
              </Link>
              <Link
                href="/audit"
                className="block rounded-lg bg-blue-600 py-2 text-center text-white"
              >
                Run Free Audit
              </Link>
              <div className="py-2">
                <UserMenu />
              </div>
            </div>
          </div>
        )}
      </nav>

      <section className="px-4 pb-20 pt-32">
        <div className="container mx-auto text-center">
          <div className="mb-6 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            <Zap className="mr-1 h-4 w-4" />
            The AI Search Operating System
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Every other tool tells you you&apos;re invisible to AI.{" "}
            <span className="text-blue-600">We make you impossible to ignore.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600">
            Audit your brand across ChatGPT, Perplexity, Claude, and Gemini. See exactly where
            competitors are beating you — then let AI Search Rank write the fixes and build your
            roadmap. Find and fix, in one place.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/audit"
              className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-medium text-white transition hover:bg-blue-700"
            >
              Run Your Free Audit →
            </Link>
            <Link
              href="/sample-audit"
              className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-8 py-3 text-lg font-medium text-gray-700 transition hover:bg-gray-200"
            >
              <Search className="mr-2 h-5 w-5" />
              See a Sample Audit
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Free audit • No credit card • Results in minutes
          </p>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-20">
        <div className="container mx-auto">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              You&apos;re losing customers inside answers you&apos;ll never see.
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              68% of searches now end without a click — the answer happens on the screen, and the
              user never reaches your site. When someone asks AI for &ldquo;the best [what you
              do],&rdquo; it names three companies. If you&apos;re not one of them, you don&apos;t
              lose a ranking. You lose the customer — and you never even knew the conversation
              happened.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Eye className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">You can&apos;t see it</h3>
              <p className="mt-2 text-gray-600">
                AI cites your competitors in answers you never witness. You&apos;re flying blind in
                the channel that&apos;s replacing search.
              </p>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold">Checking by hand is hopeless</h3>
              <p className="mt-2 text-gray-600">
                Manually asking ChatGPT, Perplexity, Claude, and Gemini the same questions, tracking
                who gets named — that&apos;s hours a week, and it&apos;s stale the moment you finish.
              </p>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <AlertTriangle className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">Finding gaps isn&apos;t fixing them</h3>
              <p className="mt-2 text-gray-600">
                Other tools hand you a problem list and walk away. A dashboard full of red
                doesn&apos;t move your visibility an inch.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Monitoring tools find the gap. We close it.
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Every other AI-visibility tool is a smoke detector — it tells you there&apos;s a fire.
              AI Search Rank brings the water.
            </p>
            <p className="mt-4 text-lg text-gray-600">
              Run an audit and you don&apos;t just get a score. You get the exact gaps ranked by
              what&apos;s costing you most, AI-written fixes for each one — pitch emails, content
              briefs, action steps — and a 90-day roadmap built automatically. One click moves a fix
              from &ldquo;found&rdquo; to &ldquo;in progress.&rdquo;
            </p>
            <p className="mt-4 font-semibold text-gray-900">
              That&apos;s the difference between knowing you&apos;re invisible and doing something
              about it.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Audit",
                desc: "Four AI platforms, one scan. See where you stand and where competitors win.",
              },
              {
                step: "2",
                title: "Fix",
                desc: "AI writes the remediation: emails, briefs, metrics. Not a to-do list — actual work, done.",
              },
              {
                step: "3",
                title: "Track",
                desc: "Watch your Share of Voice climb. Prove the ROI to leadership with one PDF.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-20">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              From invisible to cited in four steps
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {[
              {
                step: "01",
                title: "Run Audit",
                desc: "Enter your brand, add competitors, hit run. Four AI platforms analysed at once.",
              },
              {
                step: "02",
                title: "Review Gaps",
                desc: "See exactly where competitors are winning, ranked by severity — so you fix what matters first.",
              },
              {
                step: "03",
                title: "Generate Fixes",
                desc: "AI writes the pitch emails, content briefs, action plans, and success metrics. The work, written for you.",
              },
              {
                step: "04",
                title: "Build Your Plan",
                desc: "One click drops every fix into your 90-day roadmap. Assign, track, ship.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mb-2 text-5xl font-bold text-blue-600 opacity-20">{item.step}</div>
                <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-20">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              One platform. Find it, fix it, prove it.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md ${
                  feature.highlighted
                    ? "border-blue-500 ring-2 ring-blue-200 md:col-span-2 lg:col-span-3"
                    : ""
                }`}
              >
                <div className={feature.highlighted ? "flex flex-col gap-4 md:flex-row md:items-start" : ""}>
                  <feature.icon
                    className={`shrink-0 text-blue-600 ${
                      feature.highlighted ? "h-12 w-12" : "mb-4 h-10 w-10"
                    }`}
                  />
                  <div>
                    <h3 className={`font-semibold ${feature.highlighted ? "text-xl" : "text-lg"}`}>
                      {feature.highlighted && (
                        <Wrench className="mr-1 inline h-5 w-5 text-blue-600" />
                      )}
                      {feature.title}
                    </h3>
                    <p className={`text-gray-600 ${feature.highlighted ? "mt-2 text-base" : "mt-2"}`}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="comparison" className="bg-gray-50 px-4 py-20">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Traditional SEO measures clicks. We measure influence — and act on it.
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="mx-auto w-full max-w-4xl border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-4 text-left font-semibold">Capability</th>
                  <th className="px-4 py-4 text-center font-semibold text-blue-600">
                    AI Search Rank
                  </th>
                  <th className="px-4 py-4 text-center font-semibold">Monitoring Tools</th>
                  <th className="px-4 py-4 text-center font-semibold">Semrush</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-b">
                    <td className={`px-4 py-3 ${row.moat ? "font-semibold" : ""}`}>
                      {row.feature}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComparisonCellValue value={row.aiSearchRank} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComparisonCellValue value={row.monitoringTools} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComparisonCellValue value={row.semrush} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Different engine. Different metrics. Different outcome — you don&apos;t just learn
              you&apos;re losing. You stop losing.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Built for the teams who refuse to go invisible.
          </h2>
        </div>
      </section>

      <section id="pricing" className="bg-gray-50 px-4 py-20">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-xl text-gray-600">Start free. Scale as you grow.</p>
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-xl border bg-white p-6 shadow-sm ${
                  plan.highlighted
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200"
                }`}
              >
                {plan.highlighted && (
                  <div className="mb-2 text-center text-sm font-medium text-blue-600">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 block w-full rounded-lg px-4 py-2 text-center font-medium transition ${
                    plan.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 max-w-3xl space-y-3 text-center">
            <p className="text-sm text-gray-500">
              All paid plans include a 14-day free trial. No credit card required to run your first
              audit.
            </p>
            <p className="text-sm text-gray-500">{DOMAIN_SLOT_FOOTNOTE}</p>
            <Link href="/pricing" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View full pricing details →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-20">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Your competitors are being recommended right now. In answers you can&apos;t see.
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Run a free audit and find out exactly where you&apos;re losing — and walk away with the
            fixes already written.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/audit"
              className="rounded-lg bg-white px-8 py-3 text-lg font-medium text-blue-600 transition hover:bg-gray-100"
            >
              Run Your Free Audit →
            </Link>
            <Link
              href="/sample-audit"
              className="rounded-lg bg-white/20 px-8 py-3 text-lg font-medium text-white transition hover:bg-white/30"
            >
              See a Sample Audit
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 px-4 py-12 text-gray-400">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
            <div className="md:col-span-2">
              <span className="text-xl font-bold text-white">AI Search Rank</span>
              <p className="mt-2 text-sm">The operating system for AI visibility.</p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#features" className="hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/audit" className="hover:text-white">
                    Free Audit
                  </Link>
                </li>
                <li>
                  <Link href="/sample-audit" className="hover:text-white">
                    Sample Audit
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/help" className="hover:text-white">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
              <h4 className="mb-3 mt-6 font-semibold text-white">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  Support:{" "}
                  <a href="mailto:support@aisearchrank.ai" className="hover:text-white">
                    support@aisearchrank.ai
                  </a>
                </li>
                <li>
                  Legal:{" "}
                  <a href="mailto:legal@aisearchrank.ai" className="hover:text-white">
                    legal@aisearchrank.ai
                  </a>
                </li>
                <li>
                  Privacy:{" "}
                  <a href="mailto:privacy@aisearchrank.ai" className="hover:text-white">
                    privacy@aisearchrank.ai
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 AI Search Rank. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
