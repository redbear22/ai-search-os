import { describe, expect, it } from "vitest";
import { buildClientPortalUrl, getPortalBaseUrl } from "@/lib/client-portal";

describe("client portal URLs", () => {
  it("buildClientPortalUrl encodes the access key in the path", () => {
    const url = buildClientPortalUrl("abc+def/key");
    expect(url).toContain("/portal/");
    expect(url).toContain(encodeURIComponent("abc+def/key"));
  });

  it("getPortalBaseUrl falls back to localhost without env", () => {
    const prevApp = process.env.NEXT_PUBLIC_APP_URL;
    const prevVercel = process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;

    expect(getPortalBaseUrl()).toBe("http://localhost:3000");

    process.env.NEXT_PUBLIC_APP_URL = prevApp;
    process.env.VERCEL_URL = prevVercel;
  });
});
