import { JITTER_MAX_MS, JITTER_MIN_MS } from "@/lib/api-protection/config";
import { isProductionSecurityEnabled } from "@/lib/api-protection/dev";

export function jitterDelayMs(): number {
  return (
    JITTER_MIN_MS +
    Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1))
  );
}

export async function applyJitter(): Promise<void> {
  if (!isProductionSecurityEnabled()) return;
  const ms = jitterDelayMs();
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
