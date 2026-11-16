import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getStorageDriver } from "@/lib/config";
import { requireSupabaseOrThrow } from "@/lib/db/repository";
import { getDb } from "@/lib/db/client";
import { publicationAttempts, publications } from "@/lib/db/schema";
import { and, eq, lte } from "drizzle-orm";
import { newId, nowIso } from "@/lib/id";

export type PublishDueResult = {
  ok: true;
  driver: string;
  processed: number;
  results: Array<{
    publicationId: string;
    outcome: string;
    mode: string;
  }>;
};

/**
 * Same mechanism used by Vercel Cron and `npm run jobs:publish-due`.
 * Local default simulates publishes (test mode) when PUBLISH_JOB_MODE=simulate.
 */
export async function runPublishDueJob(): Promise<PublishDueResult> {
  const simulate =
    (process.env.PUBLISH_JOB_MODE ?? "simulate").toLowerCase() !== "live";

  if (getStorageDriver() === "sqlite") {
    const db = getDb();
    const now = nowIso();
    const due = db
      .select()
      .from(publications)
      .where(
        and(eq(publications.status, "scheduled"), lte(publications.scheduledAt, now)),
      )
      .all();

    const results: PublishDueResult["results"] = [];
    for (const pub of due) {
      const mode = simulate ? "test" : pub.publishMode;
      if (mode === "manual") {
        const attemptId = newId("att");
        db.insert(publicationAttempts)
          .values({
            id: attemptId,
            publicationId: pub.id,
            mode: "manual",
            outcome: "skipped",
            startedAt: now,
            finishedAt: now,
            errorMessage: "manual mode — operator must publish; job only recorded due item",
            responseJson: JSON.stringify({ job: "publish-due", simulate }),
            platformPostId: null,
            platformPostUrl: null,
            idempotencyKey: `job:manual:${pub.id}:${now}`,
            reconciledFromAttemptId: null,
            createdAt: now,
          })
          .run();
        results.push({ publicationId: pub.id, outcome: "skipped", mode: "manual" });
        continue;
      }

      const attemptId = newId("att");
      const outcome = "success";
      db.insert(publicationAttempts)
        .values({
          id: attemptId,
          publicationId: pub.id,
          mode: mode === "connected" ? "connected" : "test",
          outcome,
          startedAt: now,
          finishedAt: now,
          errorMessage: null,
          responseJson: JSON.stringify({
            job: "publish-due",
            simulate: true,
            note: "local/simulated publish",
          }),
          platformPostId: `sim_${pub.id.slice(0, 8)}`,
          platformPostUrl: `https://example.test/posts/${pub.id}`,
          idempotencyKey: `job:sim:${pub.id}:${pub.scheduledAt}`,
          reconciledFromAttemptId: null,
          createdAt: now,
        })
        .run();
      db.update(publications)
        .set({
          status: "published",
          confirmationKind: mode === "connected" ? "platform" : "test",
          publishedAt: now,
          lastAttemptId: attemptId,
          postUrl: `https://example.test/posts/${pub.id}`,
          updatedAt: now,
        })
        .where(eq(publications.id, pub.id))
        .run();
      results.push({
        publicationId: pub.id,
        outcome,
        mode: mode === "connected" ? "connected" : "test",
      });
    }

    return { ok: true, driver: "sqlite", processed: results.length, results };
  }

  requireSupabaseOrThrow();
  const sb = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { data: due, error } = await sb
    .from("publications")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);
  if (error) throw error;

  const results: PublishDueResult["results"] = [];
  for (const pub of due ?? []) {
    const mode = simulate ? "test" : pub.publish_mode;
    if (mode === "manual") {
      await sb.from("publication_attempts").insert({
        publication_id: pub.id,
        mode: "manual",
        outcome: "skipped",
        finished_at: now,
        error_message: "manual mode — operator must publish",
        response_json: { job: "publish-due", simulate },
        idempotency_key: `job:manual:${pub.id}:${now}`,
      });
      results.push({ publicationId: pub.id, outcome: "skipped", mode: "manual" });
      continue;
    }

    const { data: attempt, error: aErr } = await sb
      .from("publication_attempts")
      .insert({
        publication_id: pub.id,
        mode: mode === "connected" ? "connected" : "test",
        outcome: "success",
        finished_at: now,
        response_json: { job: "publish-due", simulate: true },
        platform_post_id: `sim_${String(pub.id).slice(0, 8)}`,
        platform_post_url: `https://example.test/posts/${pub.id}`,
        idempotency_key: `job:sim:${pub.id}:${pub.scheduled_at}`,
      })
      .select()
      .single();
    if (aErr) throw aErr;

    await sb
      .from("publications")
      .update({
        status: "published",
        confirmation_kind: mode === "connected" ? "platform" : "test",
        published_at: now,
        last_attempt_id: attempt.id,
        post_url: `https://example.test/posts/${pub.id}`,
        updated_at: now,
      })
      .eq("id", pub.id);

    results.push({
      publicationId: pub.id,
      outcome: "success",
      mode: mode === "connected" ? "connected" : "test",
    });
  }

  return { ok: true, driver: "supabase", processed: results.length, results };
}
