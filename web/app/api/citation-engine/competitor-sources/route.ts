import { NextResponse } from "next/server";
import {
  MOCK_COMPETITOR_SOURCES,
  fetchCitationEngineSources,
} from "@/lib/citation-engine";

export async function GET() {
  const result = await fetchCitationEngineSources(
    "sources/competitor-only",
    MOCK_COMPETITOR_SOURCES
  );
  return NextResponse.json(result);
}
