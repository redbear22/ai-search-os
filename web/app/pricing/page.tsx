"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Menu, X } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { DOMAIN_SLOT_FOOTNOTE, PRICING_PLANS, PRICING_TRIAL_FOOTNOTE } from "@/lib/pricing-plans";
import "./pricing.css";

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="pricing-page min-h-screen">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="pricing-brand text-xl">
              AI Search Rank
            </Link>

            <div className="hidden items-center space-x-6 md:flex">
              <Link href="/#features" className="pricing-nav-link">
                Features
              </Link>
              <Link href="/pricing" className="pricing-nav-link pricing-nav-link-active">
                Pricing
              </Link>
              <Link href="/#comparison" className="pricing-nav-link">
                Comparison
              </Link>
              <Link href="/free-audit" className="pricing-nav-cta">
                Run Free Audit
              </Link>
              <UserMenu />
            </div>

            <button
              type="button"
              className="pricing-menu-btn md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="pricing-mobile-menu border-b md:hidden">
            <div className="space-y-1 px-4 py-2">
              <Link href="/#features" className="block py-2 pricing-nav-link">
                Features
              </Link>
              <Link href="/pricing" className="block py-2 pricing-nav-link pricing-nav-link-active">
                Pricing
              </Link>
              <Link href="/#comparison" className="block py-2 pricing-nav-link">
                Comparison
              </Link>
              <Link href="/free-audit" className="pricing-nav-cta block py-2">
                Run Free Audit
              </Link>
              <div className="py-2">
                <UserMenu />
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="px-4 pb-20 pt-32">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h1 className="text-3xl sm:text-4xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-xl">
              Start free. Scale from one brand to a full agency portfolio.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`pricing-card flex flex-col p-6 ${
                  plan.highlighted ? "pricing-card-featured" : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="pricing-badge mb-2 text-center text-sm font-medium">
                    MOST POPULAR
                  </div>
                )}
                <h2 className="text-2xl">{plan.name}</h2>
                <div className="mt-4">
                  <span className="pricing-price text-4xl">{plan.price}</span>
                  {plan.period && <span className="pricing-period">{plan.period}</span>}
                </div>
                <p className="pricing-desc mt-2 text-sm">{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="pricing-check mt-0.5 h-4 w-4 shrink-0" />
                      <span className="pricing-feature">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 block w-full rounded-lg px-4 py-2 text-center font-medium transition ${
                    plan.highlighted ? "pricing-cta-primary" : "pricing-cta-ghost"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-3 text-center">
            <p className="pricing-footnote">{PRICING_TRIAL_FOOTNOTE}</p>
            <p className="pricing-footnote">
              <Link href="/free-audit">
                Run a free audit
              </Link>{" "}
              — no account required (one per IP every 24 hours).
            </p>
            <p className="pricing-footnote">{DOMAIN_SLOT_FOOTNOTE}</p>
          </div>
        </div>
      </main>

      <footer className="px-4 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <span className="pricing-footer-brand">AI Search Rank</span>
          <div className="flex gap-6">
            <Link href="/">
              Home
            </Link>
            <Link href="/contact">
              Contact
            </Link>
            <Link href="/terms">
              Terms
            </Link>
            <Link href="/privacy">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
