import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireEnterprisePlan } from "@/lib/api-v1/auth";
import { generateApiKey } from "@/lib/api-v1/crypto";
import { apiV1Error, apiV1Success } from "@/lib/api-v1/response";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

export async function GET() {
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  const planError = await requireEnterprisePlan(access.agencyId);
  if (planError) return planError;

  const keys = await prisma.apiKey.findMany({
    where: { agencyId: access.agencyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return apiV1Success(
    keys.map((k) => ({
      ...k,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
      scopes: JSON.parse(k.scopes) as string[],
    }))
  );
}

export async function POST(request: NextRequest) {
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  const planError = await requireEnterprisePlan(access.agencyId);
  if (planError) return planError;

  let body: { name?: string; scopes?: string[]; expiresAt?: string };
  try {
    body = await request.json();
  } catch {
    return apiV1Error("validation_error", "Invalid JSON body", 400);
  }

  const name = body.name?.trim();
  if (!name) {
    return apiV1Error("validation_error", "name is required", 400);
  }

  const { plaintext, hash, prefix } = generateApiKey();
  const scopes = body.scopes?.length ? body.scopes : undefined;

  const key = await prisma.apiKey.create({
    data: {
      agencyId: access.agencyId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: JSON.stringify(scopes ?? []),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });

  return apiV1Success(
    {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      apiKey: plaintext,
      createdAt: key.createdAt.toISOString(),
    },
    { warning: "Store the apiKey value securely — it will not be shown again." },
    201
  );
}
