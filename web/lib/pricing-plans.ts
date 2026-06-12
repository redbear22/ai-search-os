import type { PlanType } from "@prisma/client";
import { DOMAIN_LIMITS } from "@/lib/domain-limits";

export type PricingPlan = {
  /** User-facing plan name */
  name: string;
  /** Internal PlanType — Starter maps to FREE */
  planType: PlanType;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
};

function domainFeature(planType: PlanType): string {
  const limit = DOMAIN_LIMITS[planType];
  if (limit === Infinity) return "Custom brand / domain limits";
  if (limit === 1) return "1 brand / domain";
  return `Up to ${limit} brands / domains`;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Starter",
    planType: "FREE",
    price: "$49",
    period: "/month",
    description: "For solo practitioners monitoring one brand",
    features: [
      domainFeature("FREE"),
      "Manual audits",
      "4-platform gap detection",
      "Browser workspace",
      "Basic remediation suggestions",
    ],
    cta: "Start free trial",
    href: "/auth/signin",
    highlighted: false,
  },
  {
    name: "Pro",
    planType: "PRO",
    price: "$149",
    period: "/month",
    description: "For SEO professionals and small teams",
    features: [
      domainFeature("PRO"),
      "Automated audits",
      "Team sharing (up to 5 users)",
      "Cloud workspace",
      "AI-generated fixes",
      "Executive summary PDF",
      "90-day action plan",
    ],
    cta: "Start free trial",
    href: "/auth/signin",
    highlighted: true,
  },
  {
    name: "Agency",
    planType: "AGENCY",
    price: "$399",
    period: "/month",
    description: "For agencies managing multiple client brands",
    features: [
      domainFeature("AGENCY"),
      "Everything in Pro",
      "Agency dashboard & client workspaces",
      "White-label branding & client portals",
      "Team roles (Owner, Admin, Team)",
      "Scheduled client reports",
    ],
    cta: "Start free trial",
    href: "/auth/signin",
    highlighted: false,
  },
  {
    name: "Enterprise",
    planType: "ENTERPRISE",
    price: "Custom",
    period: "",
    description: "For organizations with advanced security and scale needs",
    features: [
      domainFeature("ENTERPRISE"),
      "Everything in Agency",
      "Enterprise API access",
      "SSO (SAML/OIDC) — contact us",
      "Priority support — contact us for SLA",
      "Custom integrations & onboarding",
    ],
    cta: "Contact Sales",
    href: "/contact",
    highlighted: false,
  },
];

export const DOMAIN_SLOT_FOOTNOTE =
  "Domain slots group subdomains under the same root domain (e.g. blog.example.com and shop.example.com share one slot). Mark a property as a separate brand when adding it if it should count on its own.";
