"use client";

import { useState } from "react";
import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
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
  TrendingUp,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "4-Platform Audit",
    description: "ChatGPT, Perplexity, Claude, Gemini – simultaneous analysis",
  },
  {
    icon: Eye,
    title: "Citation Intelligence",
    description: "Track where AI cites you vs competitors",
  },
  {
    icon: Bot,
    title: "Agent Readiness Score",
    description: "Grade your content for AI comprehension",
  },
  {
    icon: TrendingUp,
    title: "Zero-Click Metrics",
    description: "Share of Voice, brand mention rate, citation density",
  },
  {
    icon: Zap,
    title: "AI-Generated Fixes",
    description: "Pitch emails, action plans, success metrics",
  },
  {
    icon: Calendar,
    title: "90-Day Action Plan",
    description: "Drag-and-drop board, team assignment",
  },
  {
    icon: FileText,
    title: "Executive Summary PDF",
    description: "Leadership-ready one-pager",
  },
  {
    icon: CheckCircle,
    title: "Monthly Check-in",
    description: "Track Share of Voice over time",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Up to 10 members, role-based access",
  },
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals getting started",
    features: ["Manual audits", "1 brand", "Local storage only", "Basic gap detection"],
    cta: "Get Started",
    href: "/audit",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "For SEO professionals and small teams",
    features: [
      "Automated audits",
      "Up to 10 brands",
      "Team sharing (5 users)",
      "Cloud storage",
      "AI-generated fixes",
      "Executive summary PDF",
    ],
    cta: "Subscribe",
    href: "/audit",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$1,000",
    period: "/month",
    description: "For organizations with advanced needs",
    features: [
      "Unlimited brands",
      "Unlimited team members",
      "SSO (SAML/OIDC)",
      "Audit logs",
      "Priority support (4hr SLA)",
      "SOC2 compliant",
    ],
    cta: "Contact Sales",
    href: "mailto:support@ai-search-os.com",
    highlighted: false,
  },
];

const comparison = [
  { feature: "4-platform simultaneous audit", aiSearchRank: true, citationLab: false, semrush: false },
  { feature: "Real-time citation monitoring", aiSearchRank: true, citationLab: true, semrush: false },
  { feature: "AI-generated fixes", aiSearchRank: true, citationLab: false, semrush: false },
  { feature: "Action plan with success metrics", aiSearchRank: true, citationLab: false, semrush: false },
  { feature: "Agent Readiness Score", aiSearchRank: true, citationLab: false, semrush: false },
  { feature: "Zero-click metrics dashboard", aiSearchRank: true, citationLab: false, semrush: false },
  { feature: "Team collaboration", aiSearchRank: true, citationLab: false, semrush: true },
  { feature: "Executive summary PDF", aiSearchRank: true, citationLab: false, semrush: true },
];

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
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
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
              <Link href="#pricing" className="block py-2 text-gray-600">
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
            AI Search is Here
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Stop Guessing How AI Sees Your Brand.
            <span className="text-blue-600"> Start Optimizing.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600">
            One audit. Four AI platforms. Instant gap detection. AI-generated fixes. Track Share
            of Voice improvement.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/audit"
              className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-medium text-white transition hover:bg-blue-700"
            >
              Run Your Free Audit →
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-8 py-3 text-lg font-medium text-gray-700 transition hover:bg-gray-200"
            >
              <Video className="mr-2 h-5 w-5" />
              Watch Demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Free audit • No credit card required • 60 seconds
          </p>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-20">
        <div className="container mx-auto">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              60% of Searches End Without a Click
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Your brand is invisible to AI search. Your competitors are winning.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Eye className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">No Visibility</h3>
              <p className="mt-2 text-gray-600">
                You don&apos;t know where AI platforms cite your brand
              </p>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold">Manual Research</h3>
              <p className="mt-2 text-gray-600">
                Checking ChatGPT manually takes hours of your time
              </p>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <AlertTriangle className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">No Action Plan</h3>
              <p className="mt-2 text-gray-600">
                You find gaps but don&apos;t know how to fix them
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              From Audit to Action in 60 Seconds
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Four simple steps to dominate AI search visibility
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {[
              { step: "01", title: "Run Audit", desc: "Enter your brand, add competitors, click run" },
              {
                step: "02",
                title: "Review Gaps",
                desc: "See where competitors are winning, ranked by severity",
              },
              {
                step: "03",
                title: "Generate Fixes",
                desc: "AI writes pitch emails, action plans, success metrics",
              },
              {
                step: "04",
                title: "Add to Action Plan",
                desc: "One click adds to your 90-day roadmap",
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

      <section id="features" className="bg-gray-50 px-4 py-20">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything You Need to Win in AI Search
            </h2>
            <p className="mt-4 text-xl text-gray-600">9 powerful features in one platform</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <feature.icon className="mb-4 h-10 w-10 text-blue-600" />
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="comparison" className="px-4 py-20">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              How AI Search Rank Stacks Up
            </h2>
            <p className="mt-4 text-xl text-gray-600">See why leading SEO teams are switching</p>
          </div>
          <div className="overflow-x-auto">
            <table className="mx-auto w-full max-w-4xl border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-4 text-left font-semibold">Feature</th>
                  <th className="px-4 py-4 text-center font-semibold text-blue-600">
                    AI Search Rank
                  </th>
                  <th className="px-4 py-4 text-center font-semibold">CitationLab.ai</th>
                  <th className="px-4 py-4 text-center font-semibold">Semrush</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-b">
                    <td className="px-4 py-3">{row.feature}</td>
                    <td className="px-4 py-3 text-center">
                      {row.aiSearchRank ? (
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <span className="text-red-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.citationLab ? (
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <span className="text-red-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.semrush ? (
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <span className="text-red-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-center">
            <p className="text-gray-600">Traditional SEO tools measure clicks. We measure influence.</p>
            <p className="mt-1 text-sm text-gray-500">
              Different engine. Different metrics. Different results.
            </p>
          </div>
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
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border bg-white p-6 shadow-sm ${
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
                <ul className="mt-6 space-y-3">
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
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              All plans include a 14-day free trial. No credit card required to start.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-20">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Stop Guessing and Start Optimizing?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Join 500+ SEO professionals who use AI Search Rank daily.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/audit"
              className="rounded-lg bg-white px-8 py-3 text-lg font-medium text-blue-600 transition hover:bg-gray-100"
            >
              Run Your Free Audit →
            </Link>
            <a
              href="mailto:support@ai-search-os.com"
              className="rounded-lg bg-white/20 px-8 py-3 text-lg font-medium text-white transition hover:bg-white/30"
            >
              Schedule a Demo
            </a>
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
                  <Link href="#pricing" className="hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/audit" className="hover:text-white">
                    Free Audit
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
