import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { FeatureGate } from "@/components/FeatureGate";

vi.mock("@/hooks/useUser", () => ({
  useUser: vi.fn(),
}));

import { useUser } from "@/hooks/useUser";

const mockUseUser = vi.mocked(useUser);

describe("FeatureGate", () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({
      user: null,
      tier: "free",
      isLoading: false,
      loading: false,
      isAuthenticated: false,
      domainLimit: 0,
    });
  });

  it("renders children when tier has access", () => {
    mockUseUser.mockReturnValue({
      user: { id: "1", email: "a@b.com" },
      tier: "starter",
      isLoading: false,
      loading: false,
      isAuthenticated: true,
      domainLimit: 1,
    });

    const html = renderToString(
      <FeatureGate feature="cloudSave">
        <span>Save</span>
      </FeatureGate>
    );

    expect(html).toContain("Save");
    expect(html).not.toContain("opacity-50");
  });

  it("renders dimmed preview and info control when denied", () => {
    const html = renderToString(
      <FeatureGate feature="cloudSave">
        <span>Save</span>
      </FeatureGate>
    );

    expect(html).toContain("Save");
    expect(html).toContain("opacity-50");
    expect(html).toContain("Feature availability");
  });

  it("shows loading skeleton while user tier loads", () => {
    mockUseUser.mockReturnValue({
      user: null,
      tier: "free",
      isLoading: true,
      loading: true,
      isAuthenticated: false,
      domainLimit: 0,
    });

    const html = renderToString(
      <FeatureGate feature="cloudSave">
        <span>Save</span>
      </FeatureGate>
    );

    expect(html).toContain("animate-pulse");
    expect(html).not.toContain("Save");
  });
});
