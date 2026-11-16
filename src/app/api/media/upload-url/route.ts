import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireSupabaseOrThrow } from "@/lib/db/repository";
import { newId } from "@/lib/id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Logged-in operators receive a signed upload target for private bucket campaign-media.
 * Client uploads directly to Storage (no file bytes through our server).
 */
export async function POST(request: Request) {
  try {
    requireSupabaseOrThrow();
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "supabase_not_configured",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { campaignId?: string; filename?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.campaignId || !body.filename) {
    return NextResponse.json(
      { ok: false, error: "campaignId_and_filename_required" },
      { status: 400 },
    );
  }

  const safeName = body.filename.replace(/[^\w.\-]+/g, "_");
  const path = `${body.campaignId}/${newId("media")}_${safeName}`;
  const admin = createSupabaseServiceClient();
  const { data, error } = await admin.storage
    .from("campaign-media")
    .createSignedUploadUrl(path);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint: "Ensure migration created bucket campaign-media and Storage policies.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    bucket: "campaign-media",
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    contentType: body.contentType ?? null,
  });
}
