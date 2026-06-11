import { NextResponse } from "next/server";
import { embedCanary } from "@/lib/data-obfuscation/canary";
import type { ApiV1Error, ApiV1ErrorCode, ApiV1Success } from "@/types/api-v1";

export function apiV1Success<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse<ApiV1Success<T>> {
  const payload = {
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(
    embedCanary(payload as Record<string, unknown>) as unknown as ApiV1Success<T>,
    { status }
  );
}

export function apiV1Error(
  code: ApiV1ErrorCode,
  message: string,
  status: number,
  headers?: Record<string, string>
): NextResponse<ApiV1Error> {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}
