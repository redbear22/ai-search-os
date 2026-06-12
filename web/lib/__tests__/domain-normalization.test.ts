import { describe, expect, it } from "vitest";
import {
  getDomainGroupKey,
  getRootDomain,
  normalizeDomain,
} from "@/lib/domain-normalization";

describe("normalizeDomain", () => {
  it("strips protocol, www, path, query, and fragment", () => {
    expect(normalizeDomain("https://www.example.com/blog/post?q=1#section")).toBe(
      "example.com"
    );
  });

  it("handles bare hostnames", () => {
    expect(normalizeDomain("example.com")).toBe("example.com");
  });

  it("resolves UK public suffixes", () => {
    expect(normalizeDomain("https://www.shop.example.co.uk/products")).toBe(
      "example.co.uk"
    );
  });

  it("collapses subdomains to registrable root", () => {
    expect(normalizeDomain("blog.cdn.shop.example.com")).toBe("example.com");
  });

  it("strips ports", () => {
    expect(normalizeDomain("https://www.example.com:8443/api")).toBe("example.com");
  });

  it("returns empty string for blank input", () => {
    expect(normalizeDomain("   ")).toBe("");
  });
});

describe("getRootDomain", () => {
  it("matches normalizeDomain", () => {
    expect(getRootDomain("http://WWW.Example.COM/path")).toBe("example.com");
  });
});

describe("getDomainGroupKey", () => {
  it("groups subdomains under the same root", () => {
    const root = "example.com";
    expect(getDomainGroupKey("https://app.example.com")).toBe(root);
    expect(getDomainGroupKey("https://www.example.com")).toBe(root);
    expect(getDomainGroupKey("example.com")).toBe(root);
  });
});
