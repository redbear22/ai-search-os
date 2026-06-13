import type { AIPlatform, ClarityLayer, PlatformClarity } from "@/lib/audit-types";
import { missingConsensusKeywords } from "@/lib/clarity-response-compare";

export const CLARITY_PLATFORM_LABELS: Record<AIPlatform, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
  google_aio: "Google AI Overviews",
};

export const CLARITY_PLATFORM_COLORS: Partial<Record<AIPlatform, string>> = {
  google_aio: "#34A853",
};

export const CLARITY_PLATFORMS: AIPlatform[] = [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
  "google_aio",
];

function normalizeItem(item: string): string {
  return item.trim().toLowerCase();
}

function itemsMatch(a: string, b: string): boolean {
  const na = normalizeItem(a);
  const nb = normalizeItem(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function itemInList(item: string, list: string[]): boolean {
  return list.some((entry) => itemsMatch(entry, item));
}

/** Confidence from comparison tags (0–100). Null if not yet analyzed. */
export function computePlatformConfidence(data: PlatformClarity): number | null {
  const total =
    data.correctItems.length + data.wrongItems.length + data.missingItems.length;
  if (total === 0) return null;

  const consensus = data.correctItems.length + data.missingItems.length;
  const matched = data.correctItems.length;
  const base = consensus > 0 ? (matched / consensus) * 100 : 50;
  const penalty = data.wrongItems.length * 10 + data.missingItems.length * 3;
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}

export interface PlatformComparison {
  platform: AIPlatform;
  label: string;
  responseText: string;
  confidence: number | null;
  correctItems: string[];
  wrongItems: string[];
  missingItems: string[];
  /** Correct on other platforms but absent here */
  missingVsPeers: string[];
  /** Correct only on this platform */
  uniqueCorrect: string[];
  /** Consensus keywords absent from response */
  missedKeywords: string[];
}

export function buildPlatformComparisons(
  clarity: ClarityLayer,
  liveResponses: Partial<Record<AIPlatform, string>> = {}
): PlatformComparison[] {
  return CLARITY_PLATFORMS.map((platform) => {
    const data = clarity.platforms[platform];
    const responseText = data.responseText.trim() || liveResponses[platform]?.trim() || "";

    const otherCorrect = CLARITY_PLATFORMS.filter((p) => p !== platform).flatMap(
      (p) => clarity.platforms[p].correctItems
    );

    const missingVsPeers = [
      ...data.missingItems,
      ...otherCorrect.filter((item) => !itemInList(item, data.correctItems)),
    ].filter(
      (item, index, arr) =>
        arr.findIndex((x) => itemsMatch(x, item)) === index &&
        !itemInList(item, data.correctItems)
    );

    const uniqueCorrect = data.correctItems.filter(
      (item) =>
        !CLARITY_PLATFORMS.some(
          (p) => p !== platform && itemInList(item, clarity.platforms[p].correctItems)
        )
    );

    const missedKeywords = missingConsensusKeywords(responseText, missingVsPeers);

    return {
      platform,
      label: CLARITY_PLATFORM_LABELS[platform],
      responseText,
      confidence: computePlatformConfidence(data),
      correctItems: data.correctItems,
      wrongItems: data.wrongItems,
      missingItems: data.missingItems,
      missingVsPeers,
      uniqueCorrect,
      missedKeywords,
    };
  });
}

export function confidenceLabel(score: number | null): string {
  if (score === null) return "Review needed";
  if (score >= 70) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

export function confidenceTone(score: number | null): "high" | "moderate" | "low" | "pending" {
  if (score === null) return "pending";
  if (score >= 70) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

function wrapPdfText(doc: import("jspdf").jsPDF, text: string, x: number, y: number, maxWidth: number) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y);
  return y + lines.length * 5;
}

export async function exportComparisonPdf(
  brand: string,
  comparisons: PlatformComparison[]
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const ensureSpace = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFontSize(16);
  doc.text(`Clarity Comparison: ${brand || "Brand"}`, margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
  y += 12;
  doc.setTextColor(0);

  for (const row of comparisons) {
    ensureSpace(40);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    const conf =
      row.confidence !== null ? `${row.confidence}% (${confidenceLabel(row.confidence)})` : "Review needed";
    doc.text(`${row.label} — Confidence: ${conf}`, margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (row.responseText) {
      ensureSpace(20);
      y = wrapPdfText(doc, row.responseText, margin, y, maxWidth) + 4;
    } else {
      doc.text("(No response recorded)", margin, y);
      y += 6;
    }

    if (row.wrongItems.length) {
      ensureSpace(10);
      doc.setTextColor(180, 40, 40);
      y = wrapPdfText(doc, `Wrong: ${row.wrongItems.join("; ")}`, margin, y, maxWidth) + 3;
      doc.setTextColor(0);
    }
    if (row.correctItems.length) {
      ensureSpace(10);
      doc.setTextColor(40, 100, 60);
      y = wrapPdfText(doc, `Consensus match: ${row.correctItems.join("; ")}`, margin, y, maxWidth) + 3;
      doc.setTextColor(0);
    }
    if (row.missingVsPeers.length) {
      ensureSpace(10);
      doc.setTextColor(180, 120, 0);
      y = wrapPdfText(doc, `Missing vs consensus: ${row.missingVsPeers.join("; ")}`, margin, y, maxWidth) + 3;
      doc.setTextColor(0);
    }
    if (row.missedKeywords.length) {
      ensureSpace(8);
      doc.setTextColor(160, 100, 0);
      y = wrapPdfText(doc, `Absent keywords: ${row.missedKeywords.join(", ")}`, margin, y, maxWidth) + 3;
      doc.setTextColor(0);
    }
    if (row.uniqueCorrect.length) {
      ensureSpace(10);
      doc.setTextColor(40, 120, 60);
      y = wrapPdfText(doc, `Unique strengths: ${row.uniqueCorrect.join("; ")}`, margin, y, maxWidth) + 3;
      doc.setTextColor(0);
    }

    y += 6;
  }

  const slug = (brand || "brand").replace(/[^\w-]+/g, "-").toLowerCase();
  doc.save(`clarity-comparison-${slug}.pdf`);
}
