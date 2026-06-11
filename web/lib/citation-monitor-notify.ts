import "server-only";

import type { CitationGap } from "@/lib/ai-citation-monitor";
import type { CitationMonitorRunSummary } from "@/lib/citation-monitor-schedule";

function buildEmailHtml(
  summary: CitationMonitorRunSummary,
  gaps: CitationGap[]
): string {
  const gapRows =
    gaps.length === 0
      ? "<p>No citation gaps this run.</p>"
      : `<ul>${gaps
          .slice(0, 10)
          .map(
            (g) =>
              `<li><strong>${g.severity.toUpperCase()}</strong> — ${g.competitorCited} cited on ${g.platform} for &ldquo;${g.query}&rdquo;</li>`
          )
          .join("")}</ul>`;

  return `
    <h2>AI Citation Monitor — Weekly Report</h2>
    <p><strong>Brand:</strong> ${summary.brandName}</p>
    <p><strong>Checks run:</strong> ${summary.totalChecked}</p>
    <p><strong>Gaps found:</strong> ${summary.gapsFound}</p>
    <h3>Top gaps</h3>
    ${gapRows}
    <p><small>AI Search OS — automated citation monitoring</small></p>
  `;
}

export async function notifyCitationMonitorResults(
  summary: CitationMonitorRunSummary,
  gaps: CitationGap[],
  notifyEmail?: string
): Promise<{ sent: boolean; reason?: string }> {
  const to =
    notifyEmail?.trim() ||
    process.env.CITATION_MONITOR_NOTIFY_EMAIL?.trim() ||
    "";
  const apiKey = process.env.RESEND_API_KEY?.trim();

  console.log(
    `[citation-monitor] ${summary.brandName}: ${summary.gapsFound} gaps / ${summary.totalChecked} checks`
  );

  if (!to) {
    return { sent: false, reason: "No notify email configured" };
  }

  if (!apiKey) {
    return {
      sent: false,
      reason: "RESEND_API_KEY not set — results logged only",
    };
  }

  const from =
    process.env.RESEND_FROM?.trim() || "AI Search OS <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Citation Monitor: ${summary.gapsFound} gap${summary.gapsFound === 1 ? "" : "s"} for ${summary.brandName}`,
      html: buildEmailHtml(summary, gaps),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Citation monitor email failed:", detail);
    return { sent: false, reason: "Resend API error" };
  }

  return { sent: true };
}
