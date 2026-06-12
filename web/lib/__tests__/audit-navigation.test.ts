import { describe, expect, it } from "vitest";
import { buildAuditUrl, parseAuditSearchParams } from "@/lib/audit-navigation";

describe("audit-navigation", () => {
  it("buildAuditUrl encodes client context", () => {
    const url = buildAuditUrl({
      clientId: "cli_123",
      domain: "example.com",
      brandName: "Example Co",
    });
    expect(url).toBe(
      "/audit?clientId=cli_123&domain=example.com&brandName=Example+Co"
    );
  });

  it("buildAuditUrl omits empty values", () => {
    expect(buildAuditUrl({ clientId: "cli_123" })).toBe("/audit?clientId=cli_123");
    expect(buildAuditUrl({})).toBe("/audit");
  });

  it("parseAuditSearchParams reads domain and brand aliases", () => {
    const params = new URLSearchParams(
      "clientId=cli_1&url=site.test&brand=Acme"
    );
    expect(parseAuditSearchParams(params)).toEqual({
      clientId: "cli_1",
      domain: "site.test",
      brandName: "Acme",
    });
  });
});
