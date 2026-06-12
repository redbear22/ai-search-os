import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@prisma/client";
import { normalizeAuthEmail } from "@/lib/email-normalize";
import { getBasePrisma, getDatabaseUrl } from "@/lib/prisma";

export type AuthUserRecord = {
  id: string;
  email: string;
  role: UserRole;
};

function getSupabaseAdmin(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isAuthDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl() || getSupabaseAdmin());
}

async function findUserViaSupabase(email: string): Promise<AuthUserRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("User")
    .select("id, email, role")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.error("[auth] supabase user lookup failed:", error.message);
    return null;
  }

  if (!data?.id || !data.email || !data.role) return null;
  return data as AuthUserRecord;
}

async function findUserViaPrisma(email: string): Promise<AuthUserRecord | null> {
  const dbUser = await getBasePrisma().user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, role: true },
  });
  return dbUser;
}

/** Lookup pre-registered user — Supabase REST first (reliable on Vercel serverless). */
export async function findAuthUserByEmail(
  rawEmail: string
): Promise<AuthUserRecord | null> {
  const email = normalizeAuthEmail(rawEmail);

  const viaSupabase = await findUserViaSupabase(email);
  if (viaSupabase) return viaSupabase;

  if (!getDatabaseUrl()) return null;

  try {
    return await findUserViaPrisma(email);
  } catch (err) {
    console.error("[auth] prisma user lookup failed:", err);
    return null;
  }
}

export async function upsertAuthUser(
  rawEmail: string,
  role: UserRole
): Promise<AuthUserRecord | null> {
  const email = normalizeAuthEmail(rawEmail);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const existing = await findUserViaSupabase(email);
    if (existing) {
      const { data, error } = await supabase
        .from("User")
        .update({ role, updatedAt: new Date().toISOString() })
        .eq("id", existing.id)
        .select("id, email, role")
        .single();
      if (!error && data) return data as AuthUserRecord;
    } else {
      const { data, error } = await supabase
        .from("User")
        .insert({
          email,
          role,
          agencyRole: "AGENCY_TEAM",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select("id, email, role")
        .single();
      if (!error && data) return data as AuthUserRecord;
      if (error) console.error("[auth] supabase upsert failed:", error.message);
    }
  }

  if (!getDatabaseUrl()) return null;

  const user = await getBasePrisma().user.upsert({
    where: { email },
    create: { email, role },
    update: { role },
    select: { id: true, email: true, role: true },
  });
  return user;
}
