/**
 * Client-safe gap types and display helpers only.
 * Detection algorithms live in `@/lib/server/gap-detection` (server-only).
 */
export type { Gap, GapSeverity, GapSummary } from "@/types/gap";
export { getGapSummary, gapsToActions } from "@/types/gap";
