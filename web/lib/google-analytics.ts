// Google Analytics 4 custom event tracking (gtag loaded via @next/third-parties)

type GtagFn = (
  command: "event",
  action: string,
  params?: Record<string, string | number | undefined>
) => void;

function gtag(): GtagFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { gtag?: GtagFn }).gtag;
}

export function trackGaEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
): void {
  const fn = gtag();
  if (!fn) return;

  fn("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
}

export const trackAuditStart = () => trackGaEvent("start_audit", "engagement");

export const trackAuditComplete = () =>
  trackGaEvent("complete_audit", "conversion");

export const trackFixGenerate = () => trackGaEvent("generate_fix", "engagement");

export const trackSignup = (plan: string) =>
  trackGaEvent("signup", "conversion", plan);
