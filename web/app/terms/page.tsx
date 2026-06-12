import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for AI Search Rank — AI visibility audits and optimization platform.",
};

const COMPANY = {
  name: "AI Search Rank",
  website: "aisearchrank.ai",
  legalEmail: "legal@aisearchrank.ai",
  supportEmail: "support@aisearchrank.ai",
  privacyEmail: "privacy@aisearchrank.ai",
} as const;

const LAST_UPDATED = "June 10, 2026";

function TermsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 animate-fade-in sm:space-y-8 sm:p-6 sm:py-8">
      <div className="text-center">
        <div className="mb-2 flex justify-center">
          <Scale className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {COMPANY.name} · Last updated {LAST_UPDATED}
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Agreement overview</CardTitle>
          <CardDescription>
            Please read these Terms carefully before using {COMPANY.website}. These Terms constitute
            a legally binding agreement between you and {COMPANY.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <TermsSection id="acceptance" title="1. Acceptance of Terms">
            <p>
              By accessing or using the {COMPANY.name} platform at{" "}
              <a
                href={`https://${COMPANY.website}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {COMPANY.website}
              </a>{" "}
              (the &quot;Service&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree, do not use the Service.
            </p>
            <p>
              If you use the Service on behalf of an organization, you represent that you have
              authority to bind that organization, and &quot;you&quot; refers to that organization.
            </p>
          </TermsSection>

          <TermsSection id="description" title="2. Description of Service">
            <p>
              {COMPANY.name} provides software for measuring and improving AI search visibility,
              including multi-platform audits across ChatGPT (OpenAI), Perplexity, Claude
              (Anthropic), and Gemini (Google); gap detection; AI-generated remediation suggestions;
              citation intelligence; action planning; and related analytics and reporting tools.
            </p>
            <p>
              Features vary by plan. We may add, modify, or discontinue features with reasonable
              notice where practicable. Rules-based fallbacks may apply when third-party APIs are
              unavailable.
            </p>
          </TermsSection>

          <TermsSection id="accounts" title="3. Account Registration and Security">
            <p>
              You must provide accurate registration information and keep your account credentials
              confidential. You are responsible for all activity under your account.
            </p>
            <p>
              Notify us immediately at{" "}
              <a
                href={`mailto:${COMPANY.supportEmail}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {COMPANY.supportEmail}
              </a>{" "}
              of any unauthorized use. We reserve the right to suspend or terminate accounts that
              violate these Terms or pose a security risk.
            </p>
            <p>
              You must be at least 18 years old, or the age of majority in your jurisdiction, to use
              the Service. By creating an account, you represent that you meet this requirement and
              are legally permitted to use the Service in your location.
            </p>
          </TermsSection>

          <TermsSection id="plans" title="4. Subscription Plans">
            <p>
              We offer the following subscription tiers (pricing subject to change with notice). See
              our{" "}
              <Link href="/pricing" className="text-primary underline-offset-4 hover:underline">
                pricing page
              </Link>{" "}
              for current details:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Starter</strong> — $49/month. Manual audits, one
                brand / domain, browser workspace, 4-platform gap detection, and basic remediation
                suggestions.
              </li>
              <li>
                <strong className="text-foreground">Pro</strong> — $149/month. Automated audits, up to
                5 brands / domains, team sharing (up to 5 users), cloud workspace, AI-generated
                fixes, executive summary PDF, and 90-day action plan.
              </li>
              <li>
                <strong className="text-foreground">Agency</strong> — $399/month. Up to 25 brands /
                domains, everything in Pro, agency dashboard and client workspaces, white-label
                branding, team roles, and scheduled client reports.
              </li>
              <li>
                <strong className="text-foreground">Enterprise</strong> — Custom pricing. Everything
                in Agency plus enterprise API access, SSO (SAML/OIDC), priority support, and custom
                integrations as described in your order form.
              </li>
            </ul>
            <p>
              Plan limits, feature availability, and fair-use policies are described on our pricing
              page and in your order form. Exceeding plan limits may require an upgrade.
            </p>
          </TermsSection>

          <TermsSection id="payment" title="5. Payment Terms">
            <p>
              Paid subscriptions are billed through Stripe, our payment processor. By subscribing,
              you authorize us and Stripe to charge your payment method on a recurring basis until
              you cancel.
            </p>
            <p>
              Fees are stated exclusive of applicable taxes unless otherwise noted. You are
              responsible for all taxes associated with your purchase except taxes based on our net
              income.
            </p>
            <p>
              Subscriptions renew automatically each billing cycle. Proration may apply when changing
              plans mid-cycle. All fees are charged in U.S. dollars unless otherwise stated in your
              order. Failed payments may result in suspension of paid features after reasonable
              notice.
            </p>
          </TermsSection>

          <TermsSection id="refunds" title="6. Refund Policy">
            <p>
              <strong className="text-foreground">Paid plans (Starter, Pro, and Agency):</strong> You
              may request a full refund within seven (7) days of your initial paid subscription
              purchase if you are unsatisfied with the Service. Contact{" "}
              <a
                href={`mailto:${COMPANY.supportEmail}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {COMPANY.supportEmail}
              </a>{" "}
              with your account email and invoice details.
            </p>
            <p>
              Refunds do not apply to renewals, add-on services, or usage beyond the refund window
              unless required by law. Users who only run a free audit without a paid subscription are
              not charged and are not eligible for monetary refunds.
            </p>
            <p>
              Nothing in this policy limits refund or cancellation rights that cannot be waived under
              applicable consumer protection laws in your jurisdiction.
            </p>
          </TermsSection>

          <TermsSection id="responsibilities" title="7. User Responsibilities">
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Use the Service for unlawful, deceptive, or harmful purposes</li>
              <li>Reverse engineer, scrape, or overload the Service except as permitted by law</li>
              <li>Upload malware or attempt unauthorized access to our systems or third-party APIs</li>
              <li>Misrepresent your identity or affiliation when running audits or outreach</li>
              <li>Use AI-generated content without human review where accuracy or compliance matters</li>
              <li>Violate third-party terms when connecting OpenAI, Perplexity, Anthropic, Google, or other integrations</li>
            </ul>
            <p>
              You are solely responsible for content you submit, publish, or send using the Service,
              including pitches and outreach generated from gap fixes.
            </p>
          </TermsSection>

          <TermsSection id="ip" title="8. Intellectual Property">
            <p>
              The Service, including software, design, trademarks, and documentation, is owned by{" "}
              {COMPANY.name} or its licensors and protected by intellectual property laws. These Terms
              grant you a limited, non-exclusive, non-transferable license to use the Service during
              your subscription in accordance with these Terms.
            </p>
            <p>
              You retain ownership of your data and brand materials you submit. You grant us a
              license to process your data solely to provide and improve the Service, as described
              in our Privacy Policy.
            </p>
            <p>
              If you provide feedback or suggestions, you grant us a perpetual, royalty-free license
              to use them without obligation to you. We may use aggregated and anonymized usage data
              to improve the Service and publish industry benchmarks that do not identify you or your
              customers.
            </p>
          </TermsSection>

          <TermsSection id="privacy" title="9. Data Privacy">
            <p>
              Our collection and use of personal data is described in our{" "}
              <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              . By using the Service, you acknowledge that you have read our Privacy Policy.
            </p>
            <p>
              For privacy inquiries, contact{" "}
              <a
                href={`mailto:${COMPANY.privacyEmail}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {COMPANY.privacyEmail}
              </a>
              .
            </p>
            <p>
              Enterprise customers receive a Data Processing Agreement and current subprocessor list
              upon request or as part of their order.
            </p>
          </TermsSection>

          <TermsSection id="third-party" title="10. Third-Party Services">
            <p>
              The Service integrates with third-party providers, including but not limited to OpenAI,
              Perplexity, Anthropic, Google (Gemini and related APIs), Stripe, and optional SEO or
              citation data vendors. Your use of those integrations may be subject to separate
              third-party terms and fees (including API usage you configure with your own keys).
            </p>
            <p>
              We are not responsible for third-party availability, accuracy, or policy changes. AI
              model outputs may be incomplete or incorrect; you should verify results before making
              business decisions.
            </p>
          </TermsSection>

          <TermsSection id="liability" title="11. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY.name.toUpperCase()} AND ITS
              AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
              PROFITS, REVENUE, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
            <p>
              OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICE WILL NOT
              EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE
              CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100).
            </p>
            <p>
              Some jurisdictions do not allow certain limitations of liability. In those cases, our
              liability is limited to the fullest extent permitted by applicable law.
            </p>
          </TermsSection>

          <TermsSection id="warranties" title="12. Disclaimer of Warranties">
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
              WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT.
            </p>
            <p>
              We do not warrant that audits, scores, gap detection, or AI-generated recommendations
              will be error-free, complete, or result in improved rankings, citations, or revenue.
              The Service is a decision-support tool, not professional legal, financial, or SEO
              advice.
            </p>
          </TermsSection>

          <TermsSection id="indemnification" title="13. Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless {COMPANY.name} and its affiliates
              from claims, damages, losses, and expenses (including reasonable attorneys&apos; fees)
              arising from your use of the Service, your content, your violation of these Terms, or
              your violation of third-party rights.
            </p>
            <p>
              Enterprise customers may negotiate alternative indemnification terms in their executed
              order form or master services agreement.
            </p>
          </TermsSection>

          <TermsSection id="termination" title="14. Termination">
            <p>
              You may stop using the Service at any time. Paid subscriptions may be canceled through
              your account settings or by contacting support; cancellation takes effect at the end of
              the current billing period unless otherwise stated.
            </p>
            <p>
              We may suspend or terminate access immediately for material breach, non-payment, or
              legal requirement. Upon termination, your right to use the Service ceases. Provisions
              that by nature should survive (including payment obligations, IP, disclaimers,
              limitation of liability, and indemnification) will survive termination.
            </p>
            <p>
              Upon termination, you may request export of cloud-stored data within thirty (30) days by
              contacting{" "}
              <a
                href={`mailto:${COMPANY.supportEmail}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {COMPANY.supportEmail}
              </a>
              . We delete applicable personal data in accordance with our Privacy Policy and
              published retention schedules.
            </p>
          </TermsSection>

          <TermsSection id="governing-law" title="15. Governing Law">
            <p>
              These Terms are governed by the laws of the State of Delaware, United States, without
              regard to conflict-of-law principles. You agree that disputes arising from these Terms
              or the Service will be brought in the state or federal courts located in Delaware, except
              where mandatory consumer protection law in your jurisdiction requires otherwise.
            </p>
          </TermsSection>

          <TermsSection id="changes" title="16. Changes to Terms">
            <p>
              We may update these Terms from time to time. We will post the revised Terms on this
              page and update the &quot;Last updated&quot; date. Material changes will be notified
              by email or in-product notice where required by law.
            </p>
            <p>
              Continued use after the effective date constitutes acceptance. If you do not agree to
              revised Terms, you must stop using the Service and cancel any paid subscription.
            </p>
          </TermsSection>

          <TermsSection id="contact" title="17. Contact Information">
            <p>For questions about these Terms, contact us:</p>
            <ul className="list-none space-y-2 pl-0">
              <li>
                <strong className="text-foreground">Company:</strong> {COMPANY.name}
              </li>
              <li>
                <strong className="text-foreground">Website:</strong>{" "}
                <a
                  href={`https://${COMPANY.website}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {COMPANY.website}
                </a>
              </li>
              <li>
                <strong className="text-foreground">Legal:</strong>{" "}
                <a
                  href={`mailto:${COMPANY.legalEmail}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {COMPANY.legalEmail}
                </a>
              </li>
              <li>
                <strong className="text-foreground">Support:</strong>{" "}
                <a
                  href={`mailto:${COMPANY.supportEmail}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {COMPANY.supportEmail}
                </a>
              </li>
              <li>
                <strong className="text-foreground">Privacy:</strong>{" "}
                <a
                  href={`mailto:${COMPANY.privacyEmail}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {COMPANY.privacyEmail}
                </a>
              </li>
              <li>
                <strong className="text-foreground">Contact form:</strong>{" "}
                <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
                  aisearchrank.ai/contact
                </Link>
              </li>
            </ul>
          </TermsSection>
        </CardContent>
      </Card>
    </div>
  );
}
