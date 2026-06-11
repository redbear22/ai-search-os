import type { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api-protection";
import { handleClarityPost } from "@/lib/server/clarity-route";

async function handlePost(request: NextRequest) {
  return handleClarityPost(request, "gemini");
}

export const POST = withApiAuth(handlePost);
