import { describe, expect, it } from "vitest";
import { normalizeAuditData } from "@/lib/workflow-mappers";
import { isWorkflowAuthError } from "@/lib/workflow-api";

describe("isWorkflowAuthError", () => {
  it("treats expected non-fatal API statuses as soft failures", () => {
    for (const status of [401, 403, 404, 429, 503]) {
      expect(isWorkflowAuthError(status)).toBe(true);
    }
  });

  it("treats server errors as hard failures", () => {
    expect(isWorkflowAuthError(500)).toBe(false);
    expect(isWorkflowAuthError(502)).toBe(false);
  });
});

describe("normalizeAuditData", () => {
  it("accepts complete audit payloads", () => {
    const payload = {
      discoverability: {},
      clarity: {},
      authority: {},
      trust: {},
    };
    expect(normalizeAuditData(payload)).toEqual(payload);
  });

  it("rejects incomplete audit payloads", () => {
    expect(normalizeAuditData(null)).toBeNull();
    expect(normalizeAuditData({ discoverability: {} })).toBeNull();
  });
});
