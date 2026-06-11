import { NextResponse } from "next/server";
import { requireEnterprisePlan } from "@/lib/api-v1/auth";
import { apiV1Error, apiV1Success } from "@/lib/api-v1/response";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  const planError = await requireEnterprisePlan(access.agencyId);
  if (planError) return planError;

  const existing = await prisma.apiKey.findFirst({
    where: { id, agencyId: access.agencyId },
    select: { id: true },
  });

  if (!existing) {
    return apiV1Error("not_found", "API key not found", 404);
  }

  await prisma.apiKey.delete({ where: { id } });

  return apiV1Success({ revoked: true, id });
}
