import { NextResponse } from "next/server";
import { embedCanary } from "@/lib/data-obfuscation/canary";

export async function attachCanaryToJsonResponse(
  response: NextResponse
): Promise<NextResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return response;
  }

  try {
    const body = (await response.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return response;
    }
    if ("_sync" in body) {
      return response;
    }
    return NextResponse.json(embedCanary(body), { status: response.status });
  } catch {
    return response;
  }
}
