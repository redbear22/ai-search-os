import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAdminAtEdge } from "@/lib/admin-auth-edge";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";

const mockedGetToken = vi.mocked(getToken);

function makeRequest(): NextRequest {
  return {
    cookies: { get: () => undefined },
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe("isAdminAtEdge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  it("returns true when JWT role is ADMIN", async () => {
    mockedGetToken.mockResolvedValue({ sub: "user-1", role: "ADMIN" });
    await expect(isAdminAtEdge(makeRequest())).resolves.toBe(true);
  });

  it("returns false for non-admin roles", async () => {
    mockedGetToken.mockResolvedValue({ sub: "user-1", role: "APPROVED" });
    await expect(isAdminAtEdge(makeRequest())).resolves.toBe(false);
  });

  it("returns false when no session token", async () => {
    mockedGetToken.mockResolvedValue(null);
    await expect(isAdminAtEdge(makeRequest())).resolves.toBe(false);
  });

  it("returns false when NEXTAUTH_SECRET is missing", async () => {
    delete process.env.NEXTAUTH_SECRET;
    await expect(isAdminAtEdge(makeRequest())).resolves.toBe(false);
    expect(mockedGetToken).not.toHaveBeenCalled();
  });
});
