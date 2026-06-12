import { describe, expect, it } from "vitest";
import { maskClientId, maskDatabaseUrl } from "@/lib/env-mask";

describe("env-diagnostics masking", () => {
  it("masks database URLs without credentials", () => {
    const masked = maskDatabaseUrl(
      "postgresql://postgres.user:K9mT2xP7nQ4wR8sL6vH3jF5@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    );
    expect(masked).toBe(
      "postgresql://***@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    );
    expect(masked).not.toContain("K9mT2xP7nQ4wR8sL6vH3jF5");
    expect(masked).not.toContain("postgres.user");
  });

  it("masks OAuth client IDs partially", () => {
    const masked = maskClientId("123456789012-abcdefghijklmnop.apps.googleusercontent.com");
    expect(masked).toContain("…");
    expect(masked).not.toBe("123456789012-abcdefghijklmnop.apps.googleusercontent.com");
    expect(masked.startsWith("12345678")).toBe(true);
  });
});
