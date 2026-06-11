import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for AI Search Rank — how we collect, use, and protect your data.",
};

const COMPANY = {
  name: "AI Search Rank",
  website: "aisearchrank.ai",
  privacyEmail: "privacy@aisearchrank.ai",
  dpoEmail: "dpo@aisearchrank.ai",
} as const;

const LAST_UPDATED = "June 10, 2026";

function PolicySection({
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

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 animate-fade-in sm:space-y-8 sm:p-6 sm:py-8">
      <div className="text-center">
        <div className="mb-2 flex justify-center">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {COMPANY.name} · Last updated {LAST_UPDATED}
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Your privacy matters</CardTitle>
          <CardDescription>
            This Privacy Policy explains how {COMPANY.name} (&quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;) collects, uses, and protects information when you use{" "}
            <a
              href={`https://${COMPANY.website}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {COMPANY.website}
            </a>{" "}
            and related services (the &quot;Service&quot;).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <PolicySection id="collect" title="1. Information We Collect">
            <p>We collect the following categories of information:</p>

            <p>
              <strong className="text-foreground">Account information</strong> — When you register,
              we collect information such as your name, email address, authentication identifiers
              (e.g., via Google OAuth), and organization details for team or Enterprise accounts.
            </p>

            <p>
              <strong className="text-foreground">Audit data</strong> — Brand names, domains,
              competitor names, audit responses, gap analyses, action plans, and related content you
              enter or generate in the Service.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Free and Pro plans:</strong> Audit data is
                stored primarily in your browser&apos;s local storage on your device. You control
                this data; clearing browser storage or uninstalling may delete it. We do not
                persistently host your full audit dataset on our servers for these tiers unless you
                explicitly enable cloud sync features described at purchase.
              </li>
              <li>
                <strong className="text-foreground">Enterprise plan:</strong> Audit data and team
                workspace content are stored in encrypted cloud infrastructure with SOC 2-aligned
                controls, as described in your Enterprise agreement.
              </li>
            </ul>

            <p>
              <strong className="text-foreground">Usage data</strong> — Features used, pages
              visited, audit frequency, error logs, device/browser type, and approximate location
              derived from IP address for security and analytics.
            </p>

            <p>
              <strong className="text-foreground">Payment information</strong> — Paid subscriptions
              are processed by Stripe. We receive billing status, subscription tier, and limited
              payment metadata (e.g., last four digits of card, expiration) but do not store full
              payment card numbers on our servers.
            </p>

            <p>
              For users in the EEA, UK, and Switzerland, we process personal data on the following
              lawful bases: performance of our contract with you, legitimate interests in operating
              and securing the Service (balanced against your rights), compliance with legal
              obligations, and consent where required (e.g., non-essential cookies or marketing).
            </p>
          </PolicySection>

          <PolicySection id="use" title="2. How We Use Your Information">
            <p>We use information to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide, operate, and maintain the Service, including AI visibility audits</li>
              <li>Authenticate users and secure accounts</li>
              <li>Process subscriptions and send transactional communications about your account</li>
              <li>Improve features, fix bugs, and develop new functionality</li>
              <li>
                Generate aggregate, de-identified analytics about product usage (see opt-out below)
              </li>
              <li>
                Comply with legal obligations and enforce our{" "}
                <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
                  Terms of Service
                </Link>
              </li>
            </ul>
            <p>
              We do not sell your personal information. We do not share personal information for
              cross-context behavioral advertising as defined under the California Consumer Privacy
              Act (CCPA/CPRA).
            </p>
            <p>
              <strong className="text-foreground">Anonymous analytics opt-out:</strong> You may opt
              out of non-essential, aggregated usage analytics in account settings or by contacting{" "}
              <a
                href={`mailto:${COMPANY.privacyEmail}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {COMPANY.privacyEmail}
              </a>
              . Essential security and operational logging may still apply.
            </p>
          </PolicySection>

          <PolicySection id="storage" title="3. Data Storage and Security">
            <p>
              <strong className="text-foreground">Free and Pro — local control:</strong> Your audit
              progress, gaps, and action plans are stored in localStorage (or similar browser
              mechanisms) on your device. You are responsible for backups and for data if you switch
              browsers or devices. We cannot recover locally stored data if you clear your browser
              storage.
            </p>
            <p>
              <strong className="text-foreground">Enterprise — cloud storage:</strong> Customer data
              is stored in encrypted cloud databases with access controls, audit logging, and
              security practices designed to align with SOC 2 Type II requirements. Subprocessors
              and processing regions are listed in your Enterprise Data Processing Agreement.
            </p>
            <p>
              We implement administrative, technical, and organizational measures appropriate to the
              risk, including encryption in transit (TLS), access restrictions, and employee
              training. No method of transmission or storage is 100% secure.
            </p>
            <p>
              <strong className="text-foreground">Data retention:</strong>
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Account data: retained while your account is active and as needed for legal obligations</li>
              <li>Free/Pro audit data: retained on your device until you delete it</li>
              <li>Enterprise workspace data: per your contract and deletion request procedures</li>
              <li>Logs and backups: retained for 30–90 days unless a longer period is required by law</li>
            </ul>
          </PolicySection>

          <PolicySection id="third-party" title="4. Third-Party Services">
            <p>
              To provide audits and integrations, we may send necessary data to third-party
              providers when you use those features or supply your own API keys. These include:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">OpenAI</strong> — ChatGPT API for Clarity layer
                queries
              </li>
              <li>
                <strong className="text-foreground">Perplexity</strong> — Perplexity API for search
                and answer comparison
              </li>
              <li>
                <strong className="text-foreground">Anthropic</strong> — Claude API for Clarity
                analysis
              </li>
              <li>
                <strong className="text-foreground">Google</strong> — Gemini API and related Google
                services (e.g., Knowledge Graph where configured)
              </li>
              <li>
                <strong className="text-foreground">DataForSEO</strong> — SEO and SERP data
              </li>
              <li>
                <strong className="text-foreground">Keywords Everywhere</strong> — keyword metrics
              </li>
              <li>
                <strong className="text-foreground">Trends MCP</strong> — trend and topic signals
              </li>
              <li>
                <strong className="text-foreground">Keepa</strong> — product and pricing context
                where enabled
              </li>
              <li>
                <strong className="text-foreground">Stripe</strong> — payment processing
              </li>
            </ul>
            <p>
              Each provider processes data under its own privacy policy and terms. When you connect
              your API keys, requests may go from our servers to that provider using credentials you
              control. A current list of subprocessors is available upon request at{" "}
              <a
                href={`mailto:${COMPANY.privacyEmail}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {COMPANY.privacyEmail}
              </a>{" "}
              and is provided to Enterprise customers in their Data Processing Agreement.
            </p>
          </PolicySection>

          <PolicySection id="cookies" title="5. Cookies and Tracking">
            <p>We use cookies and similar technologies to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Keep you signed in (session and authentication cookies)</li>
              <li>Remember preferences and onboarding state</li>
              <li>Measure product usage and performance (analytics cookies, where permitted)</li>
            </ul>
            <p>
              You can control cookies through your browser settings. Disabling essential cookies
              may limit Service functionality. Visitors from the EEA, UK, and Switzerland are
              presented with cookie choices for non-essential tracking where required by law.
            </p>
          </PolicySection>

          <PolicySection id="rights" title="6. Your Rights (GDPR, CCPA)">
            <p>
              Depending on your location, you may have rights regarding your personal information,
              including:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Access</strong> — Request a copy of personal
                data we hold about you
              </li>
              <li>
                <strong className="text-foreground">Correction</strong> — Request correction of
                inaccurate data
              </li>
              <li>
                <strong className="text-foreground">Deletion</strong> — Request deletion of your
                account and associated cloud data (Free/Pro local data can be cleared in your
                browser)
              </li>
              <li>
                <strong className="text-foreground">Data portability</strong> — Request export of
                your data in a machine-readable format where technically feasible
              </li>
              <li>
                <strong className="text-foreground">Opt-out of marketing</strong> — Unsubscribe
                from promotional emails via link in messages or by contacting us
              </li>
              <li>
                <strong className="text-foreground">Opt-out of anonymous analytics</strong> — As
                described in Section 2
              </li>
            </ul>
            <p>
              <strong className="text-foreground">California residents (CCPA/CPRA):</strong> You
              have the right to know, delete, correct, and limit use of sensitive personal
              information. We do not sell personal information. California residents may submit
              requests through{" "}
              <a
                href={`mailto:${COMPANY.privacyEmail}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {COMPANY.privacyEmail}
              </a>{" "}
              or through an authorized agent with written permission.
            </p>
            <p>
              <strong className="text-foreground">EEA/UK residents (GDPR):</strong> You may lodge a
              complaint with your local supervisory authority. Our Data Protection Officer is
              reachable at{" "}
              <a
                href={`mailto:${COMPANY.dpoEmail}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {COMPANY.dpoEmail}
              </a>
              . Where required, we have appointed an EU representative for data protection inquiries
              in the European Union.
            </p>
            <p>
              To exercise rights, email{" "}
              <a
                href={`mailto:${COMPANY.privacyEmail}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {COMPANY.privacyEmail}
              </a>
              . We respond within 30 days under GDPR and within 45 days under CCPA where applicable.
            </p>
          </PolicySection>

          <PolicySection id="children" title="7. Children's Privacy">
            <p>
              The Service is not directed to children under 13 years of age in the United States, or
              under 16 where that higher age applies in an EU member state without verifiable
              parental consent. We do not knowingly collect personal information from children. If
              you believe a child has provided us personal information, contact us and we will
              delete it promptly.
            </p>
          </PolicySection>

          <PolicySection id="transfers" title="8. International Data Transfers">
            <p>
              We are based in the United States. If you access the Service from outside the U.S.,
              your information may be transferred to, stored, and processed in the U.S. and other
              countries where we or our subprocessors operate.
            </p>
            <p>
              For transfers from the EEA, UK, or Switzerland, we use Standard Contractual Clauses
              (SCCs), the UK International Data Transfer Addendum where applicable, and supplementary
              measures as needed. Enterprise customers receive transfer details in their Data
              Processing Agreement.
            </p>
          </PolicySection>

          <PolicySection id="breach" title="9. Data Breach Notification">
            <p>
              We maintain incident response procedures designed to detect, contain, and remediate
              security incidents. If we become aware of a personal data breach likely to result in
              risk to your rights and freedoms, we will notify affected users and relevant
              supervisory authorities without undue delay and, where required by GDPR, within 72
              hours of becoming aware of the breach.
            </p>
            <p>
              Enterprise customers receive breach notification in accordance with the timelines
              specified in their Data Processing Agreement.
            </p>
          </PolicySection>

          <PolicySection id="changes" title="10. Changes to Privacy Policy">
            <p>
              We may update this Privacy Policy to reflect changes in our practices or applicable
              law. We will post the revised policy on this page and update the &quot;Last
              updated&quot; date. Material changes will be communicated by email or in-product
              notice where required by law.
            </p>
            <p>
              Your continued use of the Service after the effective date constitutes acceptance of
              the updated policy, unless applicable law requires your explicit consent.
            </p>
          </PolicySection>

          <PolicySection id="contact" title="11. Contact Information">
            <p>For privacy questions, requests, or complaints:</p>
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
                <strong className="text-foreground">Privacy inquiries:</strong>{" "}
                <a
                  href={`mailto:${COMPANY.privacyEmail}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {COMPANY.privacyEmail}
                </a>
              </li>
              <li>
                <strong className="text-foreground">Data Protection Officer:</strong>{" "}
                <a
                  href={`mailto:${COMPANY.dpoEmail}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {COMPANY.dpoEmail}
                </a>
              </li>
              <li>
                <strong className="text-foreground">Contact form:</strong>{" "}
                <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
                  aisearchrank.ai/contact
                </Link>
              </li>
            </ul>
          </PolicySection>
        </CardContent>
      </Card>
    </div>
  );
}
