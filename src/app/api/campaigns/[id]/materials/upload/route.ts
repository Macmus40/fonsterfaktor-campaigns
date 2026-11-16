import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { addMaterial, getCampaignBundle } from "@/lib/campaigns/repository";
import type { MaterialKind } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const MAX_BYTES = 20 * 1024 * 1024;

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const VIDEO_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^cmp_[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const bundle = getCampaignBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Skicka filen som formulärdata." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file_required", message: "Ingen fil i uppladdningen." },
      { status: 400 },
    );
  }

  const imageExt = IMAGE_EXT[file.type];
  const videoExt = VIDEO_EXT[file.type];
  if (!imageExt && !videoExt) {
    return NextResponse.json(
      {
        error: "unsupported_type",
        message: "Släpp ett foto (JPG, PNG, WEBP, GIF) eller en film (MP4, WEBM, MOV).",
      },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "too_large", message: "Filen är större än 20 MB." },
      { status: 400 },
    );
  }

  const kind: MaterialKind = videoExt ? "video" : "image";
  const ext = videoExt || imageExt || "";
  const storedName = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", id);
  await mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), bytes);

  const baseName = file.name.replace(/\.[^.]+$/, "").trim().slice(0, 80);
  const material = addMaterial(bundle.campaign.id, {
    kind,
    title: baseName || (kind === "video" ? "Uppladdad film" : "Uppladdat foto"),
    url: `/uploads/${id}/${storedName}`,
    mimeType: file.type,
    durationSec: kind === "video" ? null : null,
  });

  return NextResponse.json({ material }, { status: 201 });
}
