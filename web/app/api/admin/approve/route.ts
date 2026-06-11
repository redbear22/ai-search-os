import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminSession();
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email =
    body && typeof body === "object" && "email" in body
      ? normalizeEmail((body as { email: unknown }).email)
      : null;

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (existing.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot modify admin user" }, { status: 403 });
  }

  if (existing.role !== "PENDING") {
    return NextResponse.json({ error: "User is not pending approval" }, { status: 409 });
  }

  try {
    await prisma.user.update({
      where: { email },
      data: { role: "APPROVED" },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
