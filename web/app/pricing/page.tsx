"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Menu, X } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { DOMAIN_SLOT_FOOTNOTE, PRICING_PLANS } from "@/lib/pricing-plans";

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent"
            >
              AI Search Rank
            </Link>

            <div className="hidden items-center space-x-6 md:flex">
              <Link href="/#features" className="text-gray-600 hover:text-gray-900">
                Features
              </Link>
              <Link href="/pricing" className="font-medium text-gray-900">
                Pricing
              </Link>
              <Link href="/#comparison" className="text-gray-600 hover:text-gray-900">
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
              <Link href="/#features" className="block py-2 text-gray-600">
                Features
              </Link>
              <Link href="/pricing" className="block py-2 font-medium text-gray-900">
                Pricing
              </Link>
              <Link href="/#comparison" className="block py-2 text-gray-600">
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

      <main className="px-4 pb-20 pt-32">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-xl text-gray-600">
              Start free. Scale from one brand to a full agency portfolio.
            </p>
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
                <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-gray-500">{plan.period}</span>}
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

          <div className="mx-auto mt-10 max-w-3xl space-y-3 text-center">
            <p className="text-sm text-gray-500">
              All paid plans include a 14-day free trial. No credit card required to run your first
              audit.
            </p>
            <p className="text-sm text-gray-500">{DOMAIN_SLOT_FOOTNOTE}</p>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 px-4 py-8 text-gray-400">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <span className="text-white">AI Search Rank</span>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
