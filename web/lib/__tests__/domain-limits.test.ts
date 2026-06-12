import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DOMAIN_LIMITS,
  checkDomainLimit,
  getDomainSlotKey,
} from "@/lib/domain-limits";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    domain: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockedDomainFindMany = vi.mocked(prisma.domain.findMany);

function mockAgency(plan: "FREE" | "PRO" | "AGENCY" | "ENTERPRISE" = "FREE") {
  mockedUserFindUnique.mockResolvedValue({
    agencyId: "agency-1",
    agency: { subscription: { plan } },
    ownedAgencies: [],
  } as never);
}

describe("getDomainSlotKey", () => {
  it("groups subdomains under the same root by default", () => {
    expect(getDomainSlotKey("https://app.example.com", false)).toBe("example.com");
    expect(getDomainSlotKey("https://www.example.com", false)).toBe("example.com");
  });

  it("counts subdomains separately when treatAsSeparate is true", () => {
    expect(getDomainSlotKey("https://app.example.com", true)).toBe("app.example.com");
    expect(getDomainSlotKey("https://www.example.com", true)).toBe("example.com");
  });
});

describe("checkDomainLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgency("FREE");
  });

  it("does not double-count the same root domain", async () => {
    mockedDomainFindMany.mockResolvedValue([
      { url: "example.com", treatAsSeparate: false },
    ] as never);

    const result = await checkDomainLimit("user-1", "https://app.example.com");

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1);
    expect(result.limit).toBe(DOMAIN_LIMITS.FREE);
  });

  it("counts treatAsSeparate domains separately from root", async () => {
    mockAgency("PRO");
    mockedDomainFindMany.mockResolvedValue([
      { url: "example.com", treatAsSeparate: false },
    ] as never);

    const result = await checkDomainLimit("user-1", "https://app.example.com", {
      treatAsSeparate: true,
    });

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1);
    expect(result.limit).toBe(5);
  });

  it("returns limit exceeded message when at cap", async () => {
    mockedDomainFindMany.mockResolvedValue([
      { url: "alpha.com", treatAsSeparate: false },
    ] as never);

    const result = await checkDomainLimit("user-1", "https://beta.com");

    expect(result.allowed).toBe(false);
    expect(result.message).toBe("Domain limit reached (1/1)");
    expect(result.current).toBe(1);
    expect(result.limit).toBe(1);
  });

  it("allows ENTERPRISE unlimited domains", async () => {
    mockAgency("ENTERPRISE");
    const existing = Array.from({ length: 30 }, (_, i) => ({
      url: `site${i}.com`,
      treatAsSeparate: false,
    }));
    mockedDomainFindMany.mockResolvedValue(existing as never);

    const result = await checkDomainLimit("user-1", "https://newbrand.com");

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Infinity);
    expect(result.current).toBe(30);
  });
});
