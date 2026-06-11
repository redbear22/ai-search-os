import type { AIPlatform, PlatformClarity } from "@/lib/audit-types";
import { CLARITY_PLATFORMS } from "@/lib/clarity-comparison";

const STOPWORDS = new Set([
  "about", "also", "been", "being", "both", "from", "have", "that", "their",
  "them", "then", "there", "these", "they", "this", "those", "through", "very",
  "what", "when", "where", "which", "while", "with", "would", "your", "into",
  "more", "most", "some", "such", "than", "that", "the", "are", "was", "were",
  "for", "and", "but", "not", "you", "all", "can", "had", "her", "his", "how",
  "its", "may", "our", "who", "any", "each", "make", "like", "just", "over",
]);

const NEGATION = new Set(["not", "no", "never", "without", "isnt", "arent", "doesnt", "dont", "wont", "cannot"]);

export interface ExtractedFact {
  id: string;
  text: string;
  platform: AIPlatform;
  keywords: string[];
}

export interface FactCluster {
  id: string;
  representative: string;
  platforms: AIPlatform[];
  facts: ExtractedFact[];
  keywordOverlap: number;
}

export interface PlatformComparisonResult {
  platform: AIPlatform;
  correctItems: string[];
  wrongItems: string[];
  missingItems: string[];
  confidence: number;
  missingHighlights: string[];
}

export interface ClarityResponseComparison {
  analyzedAt: string;
  consensusCorrect: string[];
  clusters: FactCluster[];
  platforms: Record<AIPlatform, PlatformComparisonResult>;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const w of setA) {
    if (setB.has(w)) inter++;
  }
  const union = setA.size + setB.size - inter;
  return union ? inter / union : 0;
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 24);
}

function extractFacts(platform: AIPlatform, text: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences(text)) {
    const keywords = tokenize(sentence);
    if (keywords.length < 3) continue;
    const key = keywords.slice(0, 6).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push({
      id: `${platform}-${facts.length}`,
      text: sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence,
      platform,
      keywords,
    });
  }

  // Keyword phrases (bigrams) for short responses
  const words = tokenize(text);
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (seen.has(phrase)) continue;
    if (text.toLowerCase().includes(phrase)) {
      seen.add(phrase);
      facts.push({
        id: `${platform}-bg-${facts.length}`,
        text: phrase,
        platform,
        keywords: [words[i], words[i + 1]],
      });
    }
  }

  return facts.slice(0, 24);
}

function clusterFacts(allFacts: ExtractedFact[]): FactCluster[] {
  const clusters: FactCluster[] = [];

  for (const fact of allFacts) {
    let best: FactCluster | null = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      const repKeywords = tokenize(cluster.representative);
      const score = jaccard(fact.keywords, repKeywords);
      if (score > bestScore && score >= 0.28) {
        bestScore = score;
        best = cluster;
      }
    }

    if (best) {
      if (!best.platforms.includes(fact.platform)) {
        best.platforms.push(fact.platform);
      }
      best.facts.push(fact);
      if (fact.text.length > best.representative.length) {
        best.representative = fact.text;
      }
      best.keywordOverlap = Math.max(best.keywordOverlap, bestScore);
    } else {
      clusters.push({
        id: `c-${clusters.length}`,
        representative: fact.text,
        platforms: [fact.platform],
        facts: [fact],
        keywordOverlap: 1,
      });
    }
  }

  return clusters;
}

function textMentionsFact(responseText: string, factText: string, keywords: string[]): boolean {
  const lower = responseText.toLowerCase();
  if (lower.includes(factText.toLowerCase().slice(0, 40))) return true;
  const matched = keywords.filter((k) => lower.includes(k));
  return matched.length >= Math.min(2, keywords.length);
}

function hasNegation(text: string): boolean {
  return tokenize(text).some((w) => NEGATION.has(w));
}

const CONSENSUS_MIN = 3;

export function comparePlatformResponses(
  responses: Partial<Record<AIPlatform, string>>
): ClarityResponseComparison | null {
  const active = CLARITY_PLATFORMS.filter((p) => responses[p]?.trim());
  if (active.length < 2) return null;

  const allFacts = active.flatMap((p) => extractFacts(p, responses[p]!.trim()));
  if (!allFacts.length) return null;

  const clusters = clusterFacts(allFacts);
  const consensusClusters = clusters.filter((c) => c.platforms.length >= CONSENSUS_MIN);
  const consensusCorrect = consensusClusters.map((c) => c.representative);

  const platforms = {} as Record<AIPlatform, PlatformComparisonResult>;

  for (const platform of CLARITY_PLATFORMS) {
    const responseText = responses[platform]?.trim() || "";
    const correctItems: string[] = [];
    const missingItems: string[] = [];
    const wrongItems: string[] = [];
    const missingHighlights: string[] = [];

    for (const cluster of consensusClusters) {
      const mentioned = cluster.platforms.includes(platform);
      if (mentioned) {
        correctItems.push(cluster.representative);
      } else if (responseText) {
        missingItems.push(cluster.representative);
        missingHighlights.push(cluster.representative);
      }
    }

    for (const cluster of clusters) {
      if (cluster.platforms.length !== 1 || cluster.platforms[0] !== platform) continue;
      const solo = cluster.facts[0];

      for (const consensus of consensusClusters) {
        const overlap = jaccard(solo.keywords, tokenize(consensus.representative));
        if (overlap < 0.22) continue;
        const contradicts =
          hasNegation(solo.text) ||
          (overlap >= 0.22 && overlap < 0.38 && textMentionsFact(responseText, solo.text, solo.keywords));
        if (contradicts && !wrongItems.includes(solo.text)) {
          wrongItems.push(solo.text);
          break;
        }
      }
    }

    const consensusTotal = Math.max(consensusCorrect.length, 1);
    const matched = correctItems.length;
    const confidence = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (matched / consensusTotal) * 70 +
            (responseText ? 15 : 0) -
            wrongItems.length * 12 -
            missingItems.length * 4
        )
      )
    );

    platforms[platform] = {
      platform,
      correctItems: dedupe(correctItems),
      wrongItems: dedupe(wrongItems),
      missingItems: dedupe(missingItems),
      confidence: responseText ? confidence : 0,
      missingHighlights: dedupe(missingHighlights),
    };
  }

  return {
    analyzedAt: new Date().toISOString(),
    consensusCorrect: dedupe(consensusCorrect),
    clusters,
    platforms,
  };
}

function dedupe(items: string[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (!out.some((x) => x.toLowerCase() === item.toLowerCase())) out.push(item);
  }
  return out;
}

export function comparisonToPlatformClarity(
  result: PlatformComparisonResult
): Pick<PlatformClarity, "correctItems" | "wrongItems" | "missingItems"> {
  return {
    correctItems: result.correctItems,
    wrongItems: result.wrongItems,
    missingItems: result.missingItems,
  };
}

/** Keywords from consensus facts absent in this platform's response. */
export function missingConsensusKeywords(
  responseText: string,
  missingHighlights: string[]
): string[] {
  const lower = responseText.toLowerCase();
  const out: string[] = [];
  for (const phrase of missingHighlights) {
    const keywords = tokenize(phrase).filter((k) => k.length >= 4).slice(0, 4);
    for (const kw of keywords) {
      if (!lower.includes(kw) && !out.includes(kw)) out.push(kw);
    }
  }
  return out.slice(0, 8);
}
