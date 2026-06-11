import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  updateAgencyFaviconUrl,
  updateAgencyLogoUrl,
} from "@/lib/agency-branding";
import { hasAgencyPermission } from "@/lib/agency-rbac";
import { requireAgencyAccess } from "@/lib/workspace";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

function extForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    case "image/x-icon":
    case "image/vnd.microsoft.icon":
      return "ico";
    default:
      return "png";
  }
}

export async function POST(request: Request) {
  const access = await requireAgencyAccess();
  if (access instanceof NextResponse) return access;

  if (
    !hasAgencyPermission(access.agencyRole, "manage_agency") &&
    !hasAgencyPermission(access.agencyRole, "billing")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form" }, { status: 400 });
  }

  const assetType = formData.get("type")?.toString().trim();
  const file = formData.get("file");

  if (assetType !== "logo" && assetType !== "favicon") {
    return NextResponse.json(
      { error: 'type must be "logo" or "favicon"' },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only image files are allowed (PNG, JPEG, WebP, GIF, SVG, ICO)" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be 2MB or smaller" }, { status: 400 });
  }

  const ext = extForMime(file.type);
  const filename = assetType === "logo" ? `logo.${ext}` : `favicon.${ext}`;

  // Dev placeholder — swap for CDN upload (S3, Cloudflare R2, etc.) in production.
  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "agency",
    access.agencyId
  );
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const diskPath = path.join(uploadDir, filename);
  await writeFile(diskPath, buffer);

  const publicUrl = `/uploads/agency/${access.agencyId}/${filename}`;

  if (assetType === "logo") {
    await updateAgencyLogoUrl(access.agencyId, publicUrl);
  } else {
    await updateAgencyFaviconUrl(access.agencyId, publicUrl);
  }

  return NextResponse.json({
    ok: true,
    type: assetType,
    url: publicUrl,
  });
}
