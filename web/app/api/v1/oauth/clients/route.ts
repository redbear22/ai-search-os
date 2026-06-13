import { NextResponse } from "next/server";
import { requireEnterprisePlan } from "@/lib/api-v1/auth";
import {
  generateOAuthClientId,
  generateOAuthClientSecret,
  hashSecret,
} from "@/lib/api-v1/crypto";
import { apiV1Error, apiV1Success } from "@/lib/api-v1/response";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

export async function GET() {
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  const planError = await requireEnterprisePlan(access.agencyId, {
    userRole: access.role,
  });
  if (planError) return planError;

  const clients = await prisma.oAuthClient.findMany({
    where: { agencyId: access.agencyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientId: true,
      name: true,
      redirectUris: true,
      scopes: true,
      createdAt: true,
    },
  });

  return apiV1Success(
    clients.map((c) => ({
      id: c.id,
      clientId: c.clientId,
      name: c.name,
      redirectUris: JSON.parse(c.redirectUris) as string[],
      scopes: JSON.parse(c.scopes) as string[],
      createdAt: c.createdAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  const planError = await requireEnterprisePlan(access.agencyId, {
    userRole: access.role,
  });
  if (planError) return planError;

  let body: { name?: string; redirectUris?: string[] };
  try {
    body = await request.json();
  } catch {
    return apiV1Error("validation_error", "Invalid JSON body", 400);
  }

  const clientId = generateOAuthClientId();
  const clientSecret = generateOAuthClientSecret();

  const oauthClient = await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash: hashSecret(clientSecret),
      agencyId: access.agencyId,
      name: body.name?.trim() || "OAuth Client",
      redirectUris: JSON.stringify(body.redirectUris ?? []),
      scopes: JSON.stringify([]),
    },
    select: { id: true, clientId: true, name: true, createdAt: true },
  });

  return apiV1Success(
    {
      id: oauthClient.id,
      clientId: oauthClient.clientId,
      clientSecret,
      name: oauthClient.name,
      createdAt: oauthClient.createdAt.toISOString(),
    },
    { warning: "Store clientSecret securely — it will not be shown again." },
    201
  );
}
