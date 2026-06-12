import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "AI Search Rank pricing — Starter, Pro, Agency, and Enterprise plans for AI visibility audits and remediation.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
