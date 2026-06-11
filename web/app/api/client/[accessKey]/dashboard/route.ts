import { NextResponse } from "next/server";
import {
  auditToPortalRow,
  buildClientPortalSummary,
  getClientByAccessKey,
} from "@/lib/client-portal";

type RouteContext = { params: Promise<{ accessKey: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { accessKey } = await context.params;
  const key = accessKey?.trim();

  if (!key) {
    return NextResponse.json({ error: "Access key required" }, { status: 400 });
  }

  const settings = await getClientByAccessKey(key);

  if (!settings?.client) {
    return NextResponse.json({ error: "Portal not found" }, { status: 404 });
  }

  if (!settings.shareWithClient) {
    return NextResponse.json({ error: "Client portal is not enabled" }, { status: 403 });
  }

  const audits = settings.client.audits
    .map((audit) => auditToPortalRow(audit.id, audit.createdAt, audit.auditData))
    .filter((audit): audit is NonNullable<typeof audit> => audit !== null);

  const client = await buildClientPortalSummary(
    settings.client,
    audits,
    settings
  );

  return NextResponse.json({ client, audits });
}
