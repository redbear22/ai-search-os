import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/** Edge-safe ADMIN check — no Prisma or getServerSession (safe for middleware). */
export async function isAdminAtEdge(request: NextRequest): Promise<boolean> {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) return false;

  const token = await getToken({ req: request, secret });
  return token?.role === "ADMIN";
}
