import { NextResponse } from "next/server";
import { runPublishDueJob } from "@/lib/jobs/publish-due";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Local/dev without cron secret: allow only when explicitly enabled
    if (process.env.ALLOW_UNAUTHENTICATED_CRON === "true") return true;
    return false;
  }
  const header =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

async function handle(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        hint: "Set CRON_SECRET and send Authorization: Bearer <CRON_SECRET> (or ALLOW_UNAUTHENTICATED_CRON=true locally).",
      },
      { status: 401 },
    );
  }

  try {
    const result = await runPublishDueJob();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "job_failed";
    const status = message.includes("supabase_not_configured") || message.includes("Brak konfiguracji")
      ? 503
      : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
