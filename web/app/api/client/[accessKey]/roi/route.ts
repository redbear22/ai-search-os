import { NextResponse } from "next/server";
import { getClientByAccessKey } from "@/lib/client-portal";
import { fetchPredictiveROIForClient, toClientPortalROI } from "@/lib/predictive-roi";

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

  const roi = await fetchPredictiveROIForClient(settings.client.id, settings.client.name);
  if (!roi) {
    return NextResponse.json({ error: "ROI data unavailable" }, { status: 404 });
  }

  return NextResponse.json(toClientPortalROI(roi));
}
