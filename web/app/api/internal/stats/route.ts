import type { NextRequest } from "next/server";
import { handleHoneypotRequest } from "@/lib/data-obfuscation/honeypot";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleHoneypotRequest(request);
}

export async function POST(request: NextRequest) {
  return handleHoneypotRequest(request);
}
