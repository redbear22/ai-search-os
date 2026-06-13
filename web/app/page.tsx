"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import {
  DOMAIN_SLOT_FOOTNOTE,
  PRICING_PLANS,
  PRICING_TRIAL_FOOTNOTE,
} from "@/lib/pricing-plans";
import "./homepage.css";

const features = [
  {
    icon: "🤖",
    title: "Fix Engine",
    badge: "Moat",
    description:
      "AI writes the actual remediation — pitch emails, content briefs, action plans, success metrics. No competitor does this.",
  },
  {
    icon: "🔍",
    title: "4-Platform Audit",
    description:
      "ChatGPT, Perplexity, Claude, and Gemini analysed simultaneously. See all four verdicts in one run.",
  },
  {
    icon: "📡",
    title: "Citation Intelligence",
    description:
      "Track where AI cites you vs. competitors. Surface which sources drive your authority and which you're missing.",
  },
  {
    icon: "👁",
    title: "Zero-Click Metrics",
    description:
      "Share of Voice, brand mention rate, citation density — the metrics that matter when 68% of searches never click through.",
  },
  {
    icon: "🤖",
    title: "Agent Readiness Score",
    description:
      "Grade how well AI can parse and use your content. Fix the structural gaps that make AI skip you.",
  },
  {
    icon: "🗓",
    title: "90-Day Action Plan",
    description:
      "Drag-and-drop roadmap built from your gaps. Assign owners, set weeks, export to PDF for leadership.",
  },
  {
    icon: "📊",
    title: "Monthly Check-In",
    description:
      "Track Share of Voice against prior audits. Prove the ROI of your AEO work month over month.",
  },
  {
    icon: "⚡",
    title: "Autonomous Agent Audit",
    description:
      "Real HTTP crawl on Railway. Async job with full gap output — runs in the background while you work.",
  },
  {
    icon: "🔗",
    title: "Entity Trust Scoring",
    description:
      "Knowledge Graph clarity score. Strengthen the entity signals that make AI confidently cite your brand.",
  },
];

type ComparisonCell = boolean | "partial";

const comparison: {
  feature: string;
  moat?: boolean;
  aiSearchRank: ComparisonCell;
  monitoringTools: ComparisonCell;
  semrush: ComparisonCell;
}[] = [
  {
    feature: "4-platform simultaneous audit",
    aiSearchRank: true,
    monitoringTools: false,
    semrush: false,
  },
  {
    feature: "AI-generated fixes (the moat)",
    moat: true,
    aiSearchRank: true,
    monitoringTools: false,
    semrush: false,
  },
  {
    feature: "Automated 90-day action plan",
    moat: true,
    aiSearchRank: true,
    monitoringTools: false,
    semrush: false,
  },
  {
    feature: "Agent Readiness Score",
    aiSearchRank: true,
    monitoringTools: false,
    semrush: false,
  },
  {
    feature: "Zero-click metrics dashboard",
    aiSearchRank: true,
    monitoringTools: false,
    semrush: false,
  },
  {
    feature: "Citation intelligence",
    aiSearchRank: true,
    monitoringTools: true,
    semrush: false,
  },
  {
    feature: "Agency white-label + portals",
    aiSearchRank: true,
    monitoringTools: false,
    semrush: false,
  },
  {
    feature: "Executive summary PDF",
    aiSearchRank: true,
    monitoringTools: false,
    semrush: "partial",
  },
  {
    feature: "Traditional rank tracking",
    aiSearchRank: false,
    monitoringTools: false,
    semrush: true,
  },
];

const signalPlatforms = [
  { name: "ChatGPT", width: "12%", color: "#FF6B5E", verdict: "Not cited", className: "v-missing" },
  { name: "Perplexity", width: "34%", color: "#FFB454", verdict: "Mentioned", className: "v-partial" },
  { name: "Claude", width: "8%", color: "#FF6B5E", verdict: "Not cited", className: "v-missing" },
  { name: "Gemini", width: "61%", color: "#3FD18B", verdict: "✓ Cited", className: "v-cited" },
];

function ComparisonCellValue({ value }: { value: ComparisonCell }) {
  if (value === true) {
    return <span className="ck">✓</span>;
  }
  if (value === "partial") {
    return <span className="partial">partial</span>;
  }
  return <span className="cx">—</span>;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealEls = root.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    revealEls.forEach((el) => observer.observe(el));

    const timer = window.setTimeout(() => {
      root.querySelectorAll<HTMLElement>(".sig-bar-fill").forEach((bar) => {
        if (bar.closest(".audit-preview-card")) return;
        const targetWidth = bar.dataset.width ?? bar.style.width;
        bar.style.width = "0";
        window.setTimeout(() => {
          bar.style.width = targetWidth;
        }, 100);
      });
    }, 400);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div ref={rootRef} className="homepage">
      <div className="amb" aria-hidden />

      <nav>
        <div className="wrap nav-inner">
          <Link href="/" className="nav-brand">
            AI Search Rank
          </Link>
          <div className="nav-links">
            <Link href="#features">Features</Link>
            <Link href="#how">How it works</Link>
            <Link href="#agency">For agencies</Link>
            <Link href="#comparison">Comparison</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="/pricing">Full pricing</Link>
          </div>
          <div className="nav-actions">
            <UserMenu />
            <button
              type="button"
              className="nav-mobile-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          <Link href="/audit" className="nav-cta nav-cta-desktop">
            Run Free Audit →
          </Link>
        </div>
        <div className={`nav-mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
          <Link href="#features" onClick={closeMobileMenu}>
            Features
          </Link>
          <Link href="#how" onClick={closeMobileMenu}>
            How it works
          </Link>
          <Link href="#agency" onClick={closeMobileMenu}>
            For agencies
          </Link>
          <Link href="#comparison" onClick={closeMobileMenu}>
            Comparison
          </Link>
          <Link href="#pricing" onClick={closeMobileMenu}>
            Pricing
          </Link>
          <Link href="/pricing" onClick={closeMobileMenu}>
            Full pricing
          </Link>
          <Link href="/audit" className="nav-cta" onClick={closeMobileMenu}>
            Run Free Audit →
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="wrap">
          <div className="eyebrow reveal">AI Search Operating System</div>
          <h1 className="reveal">
            Every other tool tells you you&apos;re invisible.
            <br />
            We make you <span className="fix">impossible to ignore.</span>
          </h1>
          <p className="hero-sub reveal">
            Audit your brand across ChatGPT, Perplexity, Claude, and Gemini. Get the gaps ranked.
            Get the fixes written. Get cited.
          </p>
          <div className="hero-ctas reveal">
            <Link href="/audit" className="btn-primary">
              Run Your Free Audit →
            </Link>
            <Link href="/sample-audit" className="btn-ghost">
              See a Sample Audit
            </Link>
          </div>
          <p className="hero-fine reveal">Free · No credit card · 4 platforms scanned</p>

          <div className="signal-wrap reveal">
            <div className="signal-label">
              Live audit signal — &ldquo;best project management for remote teams&rdquo;
            </div>
            <div className="signal-bar">
              <div className="signal-query">
                Query: <b>&ldquo;What&apos;s the best project management software for remote teams?&rdquo;</b>
                &nbsp;·&nbsp; Brand: YourBrand.com &nbsp;·&nbsp; 3 competitors added
              </div>
              {signalPlatforms.map((platform) => (
                <div key={platform.name} className="signal-row">
                  <span className="sig-platform">{platform.name}</span>
                  <div className="sig-bar-track">
                    <div
                      className="sig-bar-fill"
                      data-width={platform.width}
                      style={{ width: platform.width, background: platform.color }}
                    />
                  </div>
                  <span className={`sig-verdict ${platform.className}`}>{platform.verdict}</span>
                </div>
              ))}
              <div className="signal-footer">
                <span className="sig-sov">
                  Share of Voice: <b>14%</b> &nbsp;·&nbsp; 9 gaps detected &nbsp;·&nbsp; Competitor
                  leads: 47%
                </span>
                <span className="sig-action">
                  <span className="sig-dot" />
                  Generating fixes…
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="stats">
        <div className="wrap">
          <div className="stats-inner">
            <div className="stat reveal">
              <div className="stat-num">68%</div>
              <div className="stat-lab">Searches end without a click</div>
            </div>
            <div className="stat reveal">
              <div className="stat-num">4</div>
              <div className="stat-lab">AI platforms audited at once</div>
            </div>
            <div className="stat reveal">
              <div className="stat-num">90</div>
              <div className="stat-lab">Day action plan auto-built</div>
            </div>
            <div className="stat reveal">
              <div className="stat-num">$1</div>
              <div className="stat-lab">To start your 14-day trial</div>
            </div>
          </div>
        </div>
      </div>

      <section className="problem sec-pad">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-eyebrow">The problem</div>
            <h2 className="sec-h">Your brand is losing in conversations you can&apos;t see</h2>
            <p className="sec-sub">
              When someone asks AI for &ldquo;the best [what you do],&rdquo; three brands get named.
              If you&apos;re not one of them, you don&apos;t lose a ranking — you lose the customer
              entirely.
            </p>
          </div>
          <div className="prob-grid">
            <div className="prob-card reveal">
              <div className="prob-icon">🔭</div>
              <h3>You can&apos;t see where AI ranks you</h3>
              <p>
                AI citations happen inside answers you never witness. ChatGPT, Perplexity, Claude,
                and Gemini are naming your competitors right now — and you have no data on it.
              </p>
            </div>
            <div className="prob-card reveal">
              <div className="prob-icon">⏱</div>
              <h3>Manual checking takes hours</h3>
              <p>
                Asking four AI platforms the same questions, tracking who gets cited, building a
                spreadsheet — that&apos;s hours a week and it&apos;s already stale the moment you
                finish.
              </p>
            </div>
            <div className="prob-card reveal">
              <div className="prob-icon">📋</div>
              <h3>Other tools give you gaps, not fixes</h3>
              <p>
                Every monitoring tool hands you a problem list and walks away. A dashboard full of
                red doesn&apos;t move your AI visibility an inch. You need the work done, not
                described.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec-pad" id="how">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-eyebrow">How it works</div>
            <h2 className="sec-h">From invisible to cited in one afternoon</h2>
            <p className="sec-sub">The full execution loop — not a PDF and goodbye.</p>
          </div>
          <div className="steps">
            {[
              {
                n: "1",
                icon: "🔍",
                title: "Run Audit",
                desc: "Enter your brand, add competitors. Four AI platforms analysed simultaneously — Discoverability, Clarity, Authority, Trust.",
              },
              {
                n: "2",
                icon: "📊",
                title: "Review Gaps",
                desc: "See exactly where competitors win, ranked by what's costing you the most Share of Voice. Priority order built in.",
              },
              {
                n: "3",
                icon: "✍️",
                title: "Generate Fixes",
                desc: "AI writes the pitch emails, content briefs, action steps, and success metrics. The work, written for you. Approve before anything goes live.",
              },
              {
                n: "4",
                icon: "🗓",
                title: "Ship the Plan",
                desc: "One click builds your 90-day roadmap. Assign owners, set timelines, track progress. Export to PDF for leadership.",
              },
            ].map((step) => (
              <div key={step.n} className="step reveal">
                <div className="step-icon">
                  {step.icon}
                  <span className="step-n">{step.n}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="moat-split reveal" style={{ marginTop: 72 }}>
            <div className="moat-card moat-them">
              <div className="moat-tag them">Monitoring tools</div>
              <div className="moat-score">57/100</div>
              <p>Here&apos;s your AI visibility score. Here&apos;s a list of what&apos;s wrong. Good luck.</p>
              <div className="moat-items">
                <div className="moat-item">
                  <span className="mi-icon">📉</span> Discoverability: 41/100
                </div>
                <div className="moat-item">
                  <span className="mi-icon">⚠️</span> 9 gaps detected
                </div>
                <div className="moat-item">
                  <span className="mi-icon">📋</span> Download your report
                </div>
              </div>
            </div>
            <div className="moat-card moat-us">
              <div className="moat-tag us">AI Search Rank</div>
              <div className="moat-score">57/100</div>
              <p>Same score. Here&apos;s what&apos;s causing it — and here are nine fixes, already written.</p>
              <div className="moat-items">
                <div className="moat-item">
                  <span className="mi-icon">✍️</span> Fix 1: Comparison page brief — drafted
                </div>
                <div className="moat-item">
                  <span className="mi-icon">📧</span> Fix 2: 5 authority pitch emails — drafted
                </div>
                <div className="moat-item">
                  <span className="mi-icon">🗓</span> 90-day plan — built, assigned, ready
                </div>
                <div className="moat-item">
                  <span className="mi-icon">✅</span> Awaiting your approval to go live
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features-bg sec-pad" id="features">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-eyebrow">Platform</div>
            <h2 className="sec-h">Everything in one place</h2>
            <p className="sec-sub">
              The intelligence layer, the fix engine, and the execution tools — not three separate
              subscriptions.
            </p>
          </div>
          <div className="feat-grid">
            {features.map((feature) => (
              <div key={feature.title} className="feat reveal">
                <div className="feat-icon">{feature.icon}</div>
                <h3>
                  {feature.title}
                  {feature.badge ? <span className="feat-badge">{feature.badge}</span> : null}
                </h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec-pad" id="audit-preview">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-eyebrow">Real audit output</div>
            <h2 className="sec-h">This is what your competitors don&apos;t want you to see.</h2>
            <p className="sec-sub">
              A real audit of a sample brand — the platform verdicts, the gaps, and the fixes
              already written.
            </p>
          </div>
          <div className="audit-preview-wrap">
            <div className="audit-preview-card">
              <div className="signal-query">
                Query: <b>&ldquo;best project management for remote teams&rdquo;</b>
              </div>
              {signalPlatforms.map((platform) => (
                <div key={`preview-${platform.name}`} className="signal-row">
                  <span className="sig-platform">{platform.name}</span>
                  <div className="sig-bar-track">
                    <div
                      className="sig-bar-fill"
                      style={{ width: platform.width, background: platform.color, transition: "none" }}
                    />
                  </div>
                  <span className={`sig-verdict ${platform.className}`}>{platform.verdict}</span>
                </div>
              ))}
              <div className="signal-footer">
                <span className="sig-sov">
                  Share of Voice: <b>12%</b> &nbsp;·&nbsp; 9 gaps detected
                </span>
              </div>
              <div className="audit-preview-sep" />
              <div className="audit-preview-gap-wrap">
                <div className="audit-preview-gap">
                  <div className="audit-preview-gap-top">
                    <span className="audit-preview-sev">High</span>
                    <div className="audit-preview-gap-txt">
                      <h4>No comparison content for &ldquo;remote teams&rdquo;</h4>
                      <p>Competitors own the head-to-head pages AI pulls from.</p>
                    </div>
                    <div className="audit-preview-gap-meta">
                      <div className="lab">Est. SoV cost</div>
                      <div className="val">−14%</div>
                    </div>
                  </div>
                  <div className="audit-preview-fix">
                    <div className="audit-preview-fix-tag">AI-written fix</div>
                    <div className="audit-preview-fix-body">
                      &ldquo;FlowStack vs the field: project management built for remote teams&rdquo;
                      — a comparison page structured for AI retrieval: explicit feature table,
                      plain-language verdict per use-case, schema markup for FAQ.
                    </div>
                  </div>
                </div>
              </div>
              <Link href="/sample-audit" className="audit-preview-cta">
                See all 9 gaps and fixes →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="sec-pad" id="agency">
        <div className="wrap">
          <div className="agency-layout">
            <div className="agency-copy reveal">
              <div className="sec-eyebrow">For agencies</div>
              <h2 className="sec-h">Sell outcomes, not spreadsheets</h2>
              <p>
                One workspace per client. Your logo on every report. Clients see progress inside a
                branded portal — not your internal tool.
              </p>
              <div className="agency-list">
                <div className="ag-item">Isolated client workspaces — no data bleed between accounts</div>
                <div className="ag-item">White-label reports and client portals under your brand</div>
                <div className="ag-item">Team roles (Owner, Admin, Team) with granular access</div>
                <div className="ag-item">Up to 25 client domains on Agency tier</div>
                <div className="ag-item">REST API v1 — keys, webhooks, OAuth for custom integrations</div>
                <div className="ag-item">Cross-client intelligence network and predictive ROI views</div>
              </div>
              <Link href="#pricing" className="btn-primary">
                See Agency Pricing →
              </Link>
            </div>
            <div className="agency-dash reveal">
              <div className="dash-topbar">
                <div className="dash-dots">
                  <div className="dash-dot" />
                  <div className="dash-dot" />
                  <div className="dash-dot" />
                </div>
                <div className="dash-url">aisearchrank.ai / agency</div>
              </div>
              <div className="dash-body">
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--mute)",
                    marginBottom: 14,
                  }}
                >
                  Client workspaces
                </div>
                <div className="dash-clients">
                  <div className="dash-client">
                    <div>
                      <div className="dc-name">Acme Corp</div>
                      <div className="dc-domain">acmecorp.com</div>
                    </div>
                    <div className="dc-score good">82</div>
                    <div className="dc-badge active">Active</div>
                  </div>
                  <div className="dash-client">
                    <div>
                      <div className="dc-name">Blue Ridge SaaS</div>
                      <div className="dc-domain">blueridge.io</div>
                    </div>
                    <div className="dc-score mid">61</div>
                    <div className="dc-badge needs">3 gaps</div>
                  </div>
                  <div className="dash-client">
                    <div>
                      <div className="dc-name">Northfield Legal</div>
                      <div className="dc-domain">northfieldlaw.com</div>
                    </div>
                    <div className="dc-score bad">39</div>
                    <div className="dc-badge needs">9 gaps</div>
                  </div>
                  <div className="dash-client" style={{ opacity: 0.45, borderStyle: "dashed" }}>
                    <div>
                      <div className="dc-name" style={{ color: "var(--mute)" }}>
                        + Add client
                      </div>
                    </div>
                    <div />
                    <div />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features-bg sec-pad" id="comparison">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-eyebrow">Comparison</div>
            <h2 className="sec-h">Monitoring tools find the gap. We close it.</h2>
            <p className="sec-sub">
              Traditional SEO measures clicks. We measure influence — and act on it.
            </p>
          </div>
          <div className="comp-wrap reveal">
            <table className="comp-table">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th className="us">AI Search Rank</th>
                  <th>Monitoring Tools</th>
                  <th>Semrush</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature}>
                    <td className={row.moat ? "moat" : undefined}>{row.feature}</td>
                    <td className="us">
                      <ComparisonCellValue value={row.aiSearchRank} />
                    </td>
                    <td>
                      <ComparisonCellValue value={row.monitoringTools} />
                    </td>
                    <td>
                      <ComparisonCellValue value={row.semrush} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="comp-caption reveal">
            Different engine. Different metrics. Different outcome — you don&apos;t just learn
            you&apos;re losing. You stop losing.
          </p>
        </div>
      </section>

      <section className="pricing-bg sec-pad" id="pricing">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-eyebrow">Pricing</div>
            <h2 className="sec-h">Start free. Scale to 25 client brands.</h2>
            <p className="sec-sub">
              Every paid plan starts with a $1 trial for 14 days. No credit card to start free.
            </p>
          </div>
          <div className="price-grid">
            <div className="price-card reveal">
              <div className="price-name">Free</div>
              <div className="price-amount">
                <span className="free-num">$0</span>
                <span className="per">/forever</span>
              </div>
              <div className="price-desc">
                One audit across all four platforms. No credit card required.
              </div>
              <div className="price-features">
                <div className="pf">1 audit</div>
                <div className="pf">All 4 platforms</div>
                <div className="pf">Browser-only save</div>
                <div className="pf no">No credit card</div>
                <div className="pf no">No cloud save</div>
                <div className="pf no">No AI fixes</div>
              </div>
              <Link href="/free-audit" className="price-cta ghost">
                Run Free Audit
              </Link>
            </div>

            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`price-card reveal${plan.highlighted ? " featured" : ""}`}
              >
                {plan.highlighted ? <div className="price-badge">Most popular</div> : null}
                <div className="price-name">{plan.name}</div>
                <div className="price-amount">
                  {plan.price === "Custom" ? (
                    <span className="custom-num">{plan.price}</span>
                  ) : (
                    <>
                      <span className="num">{plan.price}</span>
                      <span className="per">{plan.period}</span>
                    </>
                  )}
                </div>
                <div className="price-desc">{plan.description}</div>
                <div className="price-features">
                  {plan.features.map((feature) => (
                    <div key={feature} className="pf">
                      {feature}
                    </div>
                  ))}
                </div>
                <Link
                  href={plan.href}
                  className={`price-cta${plan.highlighted ? " primary" : " ghost"}`}
                >
                  {plan.cta}
                </Link>
                {plan.price !== "Custom" ? (
                  <div className="price-trial">14 days for $1</div>
                ) : null}
              </div>
            ))}
          </div>
          <p className="price-footer reveal">
            Enterprise (custom domains, SSO, SLA) —{" "}
            <a href="mailto:support@aisearchrank.ai">contact us</a>
          </p>
          <div className="price-footnotes reveal">
            <p>{PRICING_TRIAL_FOOTNOTE}</p>
            <p>{DOMAIN_SLOT_FOOTNOTE}</p>
            <p>
              <Link href="/pricing">View full pricing details →</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="final-cta reveal">
        <div className="wrap-sm">
          <h2>
            Your competitors are being cited <em>right now</em> — in answers you can&apos;t see.
          </h2>
          <p>
            Run a free audit in 60 seconds. Walk away knowing exactly where you&apos;re losing —
            and with the fixes already drafted.
          </p>
          <div className="hero-ctas">
            <Link href="/audit" className="btn-primary">
              Run Your Free Audit →
            </Link>
            <Link href="/sample-audit" className="btn-ghost">
              See a Sample Audit
            </Link>
          </div>
          <p className="hero-fine" style={{ marginTop: 16 }}>
            Free · No credit card · 4 platforms scanned
          </p>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="footer-inner">
            <div>
              <div className="foot-brand">AI Search Rank</div>
              <div className="foot-tagline">The AI search platform that fixes what it finds.</div>
            </div>
            <div className="foot-col">
              <h4>Product</h4>
              <Link href="#features">Features</Link>
              <Link href="#pricing">Pricing</Link>
              <Link href="/audit">Free Audit</Link>
              <Link href="/free-audit">No-signup Audit</Link>
              <Link href="/sample-audit">Sample Audit</Link>
            </div>
            <div className="foot-col">
              <h4>Resources</h4>
              <Link href="/help">Help Centre</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard/gsc">Search Console</Link>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
              <Link href="/contact">Contact</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <a href="mailto:support@aisearchrank.ai">support@aisearchrank.ai</a>
            </div>
          </div>
          <div className="foot-copy">© 2026 AI Search Rank. Built for the AI search era.</div>
        </div>
      </footer>
    </div>
  );
}
