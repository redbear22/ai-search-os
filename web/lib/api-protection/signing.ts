import { createHmac, createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SIGNATURE_MAX_AGE_MS } from "@/lib/api-protection/config";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function signingSecret(): string | null {
  return process.env.API_SIGNING_SECRET?.trim() || null;
}

export function buildSignaturePayload(
  timestamp: string,
  method: string,
  pathname: string,
  body: string
): string {
  const bodyHash = sha256Hex(body);
  return `${timestamp}\n${method.toUpperCase()}\n${pathname}\n${bodyHash}`;
}

export function computeSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function verifyEnterpriseSignature(
  request: NextRequest,
  bodyText: string
): Promise<NextResponse | null> {
  const secret = signingSecret();
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "API_SIGNING_SECRET is not configured. Enterprise signed requests are disabled.",
      },
      { status: 503 }
    );
  }

  const timestamp = request.headers.get("x-aiso-timestamp")?.trim();
  const signature = request.headers.get("x-aiso-signature")?.trim();

  if (!timestamp || !signature) {
    return NextResponse.json(
      {
        error:
          "Missing X-AISO-Timestamp or X-AISO-Signature headers for enterprise API access.",
      },
      { status: 401 }
    );
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return NextResponse.json({ error: "Invalid X-AISO-Timestamp" }, { status: 401 });
  }

  const age = Math.abs(Date.now() - ts);
  if (age > SIGNATURE_MAX_AGE_MS) {
    return NextResponse.json({ error: "Request signature expired" }, { status: 401 });
  }

  const pathname = request.nextUrl.pathname;
  const payload = buildSignaturePayload(timestamp, request.method, pathname, bodyText);
  const expected = computeSignature(payload, secret);

  try {
    const valid = timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
    if (!valid) {
      return NextResponse.json({ error: "Invalid request signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request signature" }, { status: 401 });
  }

  return null;
}
