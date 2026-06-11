export interface CheckItem {
  name: string;
  passed: boolean;
  details?: string;
  fixSuggestion: string;
}

export interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  fix: string;
  estimatedEffort: "15min" | "1hour" | "2hours" | "4hours" | "1day";
}

export interface CategoryScore {
  score: number;
  max: number;
  items: CheckItem[];
}

export interface AIReadinessScore {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  categories: {
    structuredData: CategoryScore;
    answerExtractability: CategoryScore;
    llmsTxt: CategoryScore;
    aiCrawlerAccess: CategoryScore;
    entityClarity: CategoryScore;
    contentQuality: CategoryScore;
  };
  recommendations: Recommendation[];
}

export interface AIReadinessFetchData {
  html: string;
  text: string;
  headers: Record<string, string>;
  wordCount: number;
  llmsTxtOk: boolean;
  llmsFullTxtOk: boolean;
  robotsTxt: string;
}
