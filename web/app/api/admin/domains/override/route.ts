import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type OverrideBody = {
  domainId?: string;
  treatAsSeparate?: boolean;
  reason?: string | null;
};

export async function POST(req: Request) {
  const authResult = await requireAdminSession();
  if (authResult instanceof NextResponse) return authResult;

  let body: OverrideBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const domainId = body.domainId?.trim();
  if (!domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 });
  }

  if (typeof body.treatAsSeparate !== "boolean") {
    return NextResponse.json(
      { error: "treatAsSeparate must be a boolean" },
      { status: 400 }
    );
  }

  const existing = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  await prisma.domain.update({
    where: { id: domainId },
    data: {
      treatAsSeparate: body.treatAsSeparate,
      separationReason:
        body.reason === undefined || body.reason === null
          ? null
          : String(body.reason).trim() || null,
    },
  });

  return NextResponse.json({ success: true });
}
