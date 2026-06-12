import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export function workflowErrorResponse(error: unknown): NextResponse {
  console.error("Workflow API error:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return NextResponse.json({ error: "Referenced record not found" }, { status: 404 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
