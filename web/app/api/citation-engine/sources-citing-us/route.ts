import { NextResponse } from "next/server";
import {
  MOCK_SOURCES_CITING_US,
  fetchCitationEngineSources,
} from "@/lib/citation-engine";

export async function GET() {
  const result = await fetchCitationEngineSources(
    "sources/citing-us",
    MOCK_SOURCES_CITING_US
  );
  return NextResponse.json(result);
}
