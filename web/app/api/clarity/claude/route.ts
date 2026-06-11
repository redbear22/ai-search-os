import type { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api-protection";
import { handleClarityPost } from "@/lib/server/clarity-route";

async function handlePost(request: NextRequest) {
  return handleClarityPost(request, "claude", "claude-haiku-4-5");
}

export const POST = withApiAuth(handlePost);
