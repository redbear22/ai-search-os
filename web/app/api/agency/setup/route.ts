import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getOrCreateAgencyForUser } from "@/lib/workspace";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim() || session.user.name || "My Agency";

  const agency = await getOrCreateAgencyForUser(session.user.id, name);

  return NextResponse.json({ agency });
}
