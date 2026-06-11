import type { TrendData, TrendGap } from "@/lib/trends-mcp-client";

export interface DataResult<T> {
  data: T;
  source: string;
  mock?: boolean;
  fallbackFrom?: string;
}

export interface UnifiedAuditResult {
  clarity: DataResult<string> | null;
  discoverability: {
    keywords: DataResult<unknown> | null;
    rankings: DataResult<unknown> | null;
    trends: DataResult<TrendData[]> | null;
  };
  authority: DataResult<unknown> | null;
  trust: DataResult<unknown> | null;
  contentGaps: DataResult<TrendGap[]> | null;
  errors: string[];
}
