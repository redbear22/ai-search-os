import type { ReportFrequency } from "@/types/white-label-report";

export function computeNextReportAt(
  frequency: ReportFrequency,
  from: Date = new Date()
): Date {
  const next = new Date(from);
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return [59, 130, 246];
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function wrapPdfText(
  doc: import("jspdf").jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y);
  return y + lines.length * 5;
}

export async function exportWhiteLabelReportPdf(
  data: import("@/types/white-label-report").WhiteLabelReportData
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  const [r, g, b] = hexToRgb(data.branding.brandColor);
  const [sr, sg, sb] = hexToRgb(data.branding.secondaryColor);
  let y = 18;

  const logo = data.branding.agencyLogo ?? data.branding.agencyLogoFallback;
  if (logo?.startsWith("data:image")) {
    try {
      const format = logo.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(logo, format, margin, y, 32, 12);
      y += 16;
    } catch {
      doc.setFontSize(12);
      doc.setTextColor(r, g, b);
      doc.text(data.branding.agencyName, margin, y + 4);
      y += 12;
    }
  } else {
    doc.setFontSize(12);
    doc.setTextColor(r, g, b);
    doc.text(data.branding.agencyName, margin, y + 4);
    y += 12;
  }

  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setDrawColor(sr, sg, sb);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setTextColor(0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const reportTitle =
    data.branding.reportHeader?.trim() ||
    `${data.client.name} — AI Visibility Report`;
  doc.text(reportTitle, margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  const subtitle = [
    data.client.domain,
    `Generated ${new Date(data.reportDate).toLocaleDateString()}`,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(subtitle, margin, y);
  y += 12;
  doc.setTextColor(0);

  const metrics = [
    ["Share of Voice", `${data.metrics.shareOfVoice}%`],
    ["Open Gaps", String(data.metrics.gapCount)],
    ["Actions Completed", String(data.metrics.completedActions)],
    ["SOV Improvement", `+${data.metrics.improvement}%`],
  ];

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");

  const colWidth = maxWidth / 2;
  for (let i = 0; i < metrics.length; i += 2) {
    const left = metrics[i];
    const right = metrics[i + 1];
    doc.text(`${left[0]}: ${left[1]}`, margin, y);
    if (right) doc.text(`${right[0]}: ${right[1]}`, margin + colWidth, y);
    y += 6;
  }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Layer Scores", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");

  const layers = [
    ["Discoverability", data.metrics.discoverability],
    ["Clarity", data.metrics.clarity],
    ["Authority", data.metrics.authority],
    ["Trust", data.metrics.trust],
  ] as const;

  for (const [label, score] of layers) {
    doc.text(`${label}: ${score}%`, margin, y);
    y += 6;
  }
  y += 4;

  if (data.topGaps.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Priority Gaps", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    for (const gap of data.topGaps.slice(0, 5)) {
      y = wrapPdfText(
        doc,
        `• [${gap.severity.toUpperCase()}] ${gap.title} (${gap.layer})`,
        margin,
        y,
        maxWidth
      );
      y += 2;
      if (y > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        y = 20;
      }
    }
  }

  const footer =
    data.branding.reportFooterText?.trim() ||
    `Prepared by ${data.branding.agencyName} · Powered by AI Search Rank`;

  doc.setFontSize(8);
  doc.setTextColor(120);
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.text(footer, margin, footerY, { maxWidth });

  const slug = data.client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`${slug}-visibility-report.pdf`);
}
