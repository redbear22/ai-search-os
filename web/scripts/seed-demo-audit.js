/**
 * Paste this entire file into the browser console on http://127.0.0.1:3000
 *
 * Keys match Zustand persist stores:
 *   - ai-search-os-audit-v2  (not audit-storage)
 *   - kpi-storage
 */
(function seedDemoAudit() {
  const now = new Date().toISOString();

  const discoverability = {
    seo: { traffic: 125000, keywords: 7200, siteHealth: 89 },
    aso: { brandMentions: 47, aiVisibilityScore: 68 },
    competitors: [
      { name: "Competitor A", traffic: 100000, aiVisibility: 72, brandMentions: 55 },
    ],
  };

  const clarity = {
    platforms: {
      chatgpt: {
        responseText:
          "Best home espresso machines include Breville Barista Express and Gaggia Classic Pro.",
        correctItems: ["Breville Barista Express", "Gaggia Classic Pro"],
        wrongItems: ["Nespresso Vertuo as primary espresso pick"],
        missingItems: ["Budget under $300"],
      },
      perplexity: {
        responseText: "Top picks: Breville Infuser, De'Longhi Dedica.",
        correctItems: ["Breville Infuser", "De'Longhi Dedica"],
        wrongItems: [],
        missingItems: ["Maintenance costs"],
      },
      claude: {
        responseText: "Semi-automatic machines with PID control are recommended.",
        correctItems: ["Semi-automatic recommendation"],
        wrongItems: [],
        missingItems: ["Specific brand for entry-level"],
      },
      google_ai: {
        responseText: "AI Overview highlights Breville, Gaggia, and Philips 3200.",
        correctItems: ["Breville", "Gaggia"],
        wrongItems: [],
        missingItems: ["Warranty comparison"],
      },
    },
  };

  const authority = {
    backlinksCount: 3400,
    citedPages: 12,
    sourcesCitingUs: Array.from({ length: 12 }, (_, i) => `example.com/source-${i + 1}`),
    sourcesCitingCompetitorsOnly: ["competitor-only.com/article"],
  };

  const trust = {
    averageRating: 4.2,
    reviewCount: 156,
    sentimentScore: 0.78,
    hedgedLanguageDetected: false,
  };

  localStorage.setItem(
    "ai-search-os-audit-v2",
    JSON.stringify({
      state: {
        discoverability,
        clarity,
        authority,
        trust,
        lastSavedAt: now,
        isCompleted: true,
        completedAt: now,
      },
      version: 0,
    })
  );

  localStorage.setItem(
    "kpi-storage",
    JSON.stringify({
      state: {
        kpis: [
          {
            id: "1",
            layerId: "discoverability",
            name: "Brand Mentions",
            currentValue: 47,
            targetValue: 100,
            unit: "mentions",
            ownerTeam: "SEO",
            ownerPerson: "",
            lastUpdated: now,
          },
          {
            id: "2",
            layerId: "discoverability",
            name: "AI Visibility Score",
            currentValue: 68,
            targetValue: 80,
            unit: "%",
            ownerTeam: "SEO",
            ownerPerson: "",
            lastUpdated: now,
          },
          {
            id: "3",
            layerId: "clarity",
            name: "AI Description Alignment",
            currentValue: 67,
            targetValue: 90,
            unit: "%",
            ownerTeam: "Brand Strategy",
            ownerPerson: "",
            lastUpdated: now,
          },
          {
            id: "4",
            layerId: "authority",
            name: "Unique Cited Sources",
            currentValue: 12,
            targetValue: 25,
            unit: "sources",
            ownerTeam: "PR",
            ownerPerson: "",
            lastUpdated: now,
          },
          {
            id: "5",
            layerId: "trust",
            name: "Review Sentiment",
            currentValue: 4.2,
            targetValue: 4.5,
            unit: "/5",
            ownerTeam: "Product",
            ownerPerson: "",
            lastUpdated: now,
          },
        ],
        seededAt: now,
        exportedAt: null,
      },
      version: 0,
    })
  );

  location.reload();
})();
