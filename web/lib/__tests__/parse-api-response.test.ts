import { describe, expect, it } from "vitest";
import { parseApiJson } from "@/lib/parse-api-response";

function mockResponse(body: string, init?: ResponseInit): Response {
  return new Response(body, init);
}

describe("parseApiJson", () => {
  it("parses valid JSON bodies", async () => {
    const data = await parseApiJson<{ ok: boolean }>(
      mockResponse('{"ok":true}', { status: 200 })
    );
    expect(data.ok).toBe(true);
  });

  it("throws a readable error for plain-text 500 responses", async () => {
    await expect(
      parseApiJson(mockResponse("Internal Server Error", { status: 500 }))
    ).rejects.toThrow("Request failed (500): Internal Server Error");
  });

  it("returns an empty object for empty bodies", async () => {
    const data = await parseApiJson<Record<string, never>>(
      mockResponse("", { status: 200 })
    );
    expect(data).toEqual({});
  });
});
