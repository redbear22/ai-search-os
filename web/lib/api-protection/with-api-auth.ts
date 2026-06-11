import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-protection/auth";
import { attachCanaryToJsonResponse } from "@/lib/api-protection/canary-response";

type RouteContext = { params: Promise<Record<string, string>> };

type InnerHandler = (request: NextRequest) => Promise<NextResponse>;

export type AuthenticatedRouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse>;

/**
 * Session or API-key auth + canary embedding. Jitter and IP rate limits are
 * applied in middleware so browser and programmatic clients stay transparent.
 */
export function withApiAuth(handler: InnerHandler): AuthenticatedRouteHandler {
  return async (request, _context: RouteContext) => {
    const auth = await authorizeApiRequest(request);
    if (auth instanceof NextResponse) {
      return auth;
    }

    let response: NextResponse;
    try {
      response = await handler(request);
    } catch (error) {
      console.error("[api-auth] handler error:", error);
      response = NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal error" },
        { status: 500 }
      );
    }

    return attachCanaryToJsonResponse(response);
  };
}
