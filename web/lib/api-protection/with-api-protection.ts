import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  logApiAccessStructured,
  persistApiAccessLog,
} from "@/lib/api-protection/access-log";
import { authorizeApiRequest } from "@/lib/api-protection/auth";
import { applyJitter } from "@/lib/api-protection/jitter";
import { verifyEnterpriseSignature } from "@/lib/api-protection/signing";
import { attachCanaryToJsonResponse } from "@/lib/api-protection/canary-response";

export type ApiProtectionOptions = {
  /** Stricter IP rate limit + HMAC for enterprise API keys. */
  critical?: boolean;
  /** Add 100–500ms jitter (default: true for all protected routes). */
  jitter?: boolean;
};

type RouteContext = { params: Promise<Record<string, string>> };

type InnerHandler = (request: NextRequest) => Promise<NextResponse>;

export type ProtectedRouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse>;

async function readBodyText(request: NextRequest): Promise<string> {
  if (request.method === "GET" || request.method === "HEAD") return "";
  try {
    return await request.clone().text();
  } catch {
    return "";
  }
}

export function withApiProtection(
  handler: InnerHandler,
  options: ApiProtectionOptions = {}
): ProtectedRouteHandler {
  const critical = options.critical ?? false;
  const jitter = options.jitter ?? false;

  return async (request, _context: RouteContext) => {
    const started = Date.now();

    const auth = await authorizeApiRequest(request);
    if (auth instanceof NextResponse) {
      logApiAccessStructured({
        request,
        authType: "anonymous",
        status: auth.status,
        durationMs: Date.now() - started,
      });
      return auth;
    }

    const bodyText = await readBodyText(request);

    if (critical && auth.authType === "api_key") {
      if (!auth.isEnterprise) {
        const denied = NextResponse.json(
          {
            error:
              "Enterprise plan required for critical API endpoints via API key.",
            code: "plan_required",
          },
          { status: 403 }
        );
        void persistApiAccessLog({
          request,
          authType: auth.authType,
          status: 403,
          agencyId: auth.agencyId,
          apiKeyId: auth.apiKeyId,
          durationMs: Date.now() - started,
        });
        return denied;
      }

      const sigError = await verifyEnterpriseSignature(request, bodyText);
      if (sigError) {
        void persistApiAccessLog({
          request,
          authType: auth.authType,
          status: sigError.status,
          agencyId: auth.agencyId,
          apiKeyId: auth.apiKeyId,
          durationMs: Date.now() - started,
        });
        return sigError;
      }
    }

    if (jitter) {
      await applyJitter();
    }

    let response: NextResponse;
    try {
      response = await handler(request);
    } catch (error) {
      console.error("[api-protection] handler error:", error);
      response = NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal error" },
        { status: 500 }
      );
    }

    logApiAccessStructured({
      request,
      authType: auth.authType,
      status: response.status,
      userId: auth.userId,
      agencyId: auth.agencyId,
      apiKeyId: auth.apiKeyId,
      durationMs: Date.now() - started,
    });
    void persistApiAccessLog({
      request,
      authType: auth.authType,
      status: response.status,
      userId: auth.userId,
      agencyId: auth.agencyId,
      apiKeyId: auth.apiKeyId,
      durationMs: Date.now() - started,
    });

    return attachCanaryToJsonResponse(response);
  };
}
