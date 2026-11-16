import { NextResponse } from "next/server";
import { getFoundationStatus } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, foundation: getFoundationStatus() });
}
