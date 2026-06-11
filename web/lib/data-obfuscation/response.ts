import { NextResponse } from "next/server";
import { applyJitter } from "@/lib/api-protection/jitter";
import { embedCanary } from "@/lib/data-obfuscation/canary";

export async function withResponseJitter(): Promise<void> {
  await applyJitter();
}

export function jsonWithObfuscation<T extends Record<string, unknown>>(
  data: T,
  init?: ResponseInit
): NextResponse {
  return NextResponse.json(embedCanary(data), init);
}

export async function jsonWithObfuscationAndJitter<T extends Record<string, unknown>>(
  data: T,
  init?: ResponseInit
): Promise<NextResponse> {
  await withResponseJitter();
  return jsonWithObfuscation(data, init);
}
