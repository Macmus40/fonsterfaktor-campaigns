import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { publications } from "@/lib/db/schema";
import { newId, nowIso } from "@/lib/id";
import { handoffToAnalytics } from "./analytics-handoff";
import { lookupFacebookPagePost } from "./meta/facebook-page";
import { getPublication, listAttempts } from "./service";
import { simulateTestReconcile } from "./test-mode";
import type { Publication, PublicationAttempt } from "@/lib/types";
import { publicationAttempts } from "@/lib/db/schema";
import { rowToAttempt } from "./mappers";

export type ReconcileResult = {
  publication: Publication;
  attempt: PublicationAttempt;
  safeToRetry: boolean;
  message: string;
};

/**
 * After an ambiguous send, establish platform state before any retry
 * so a second send cannot create a duplicate post.
 */
export async function reconcilePublication(
  publicationId: string,
  opts: { treatAsMissing?: boolean } = {},
): Promise<ReconcileResult> {
  const pub = getPublication(publicationId);
  if (!pub) throw new Error("Publication not found");

  const attempts = listAttempts(publicationId);
  const ambiguous = attempts.find((a) => a.outcome === "ambiguous");
  if (!ambiguous && pub.status !== "ambiguous") {
    throw new Error("Nothing to reconcile — no ambiguous attempt on record");
  }

  const startedAt = nowIso();
  const mode = pub.publishMode;
  const suspected =
    ambiguous?.platformPostId ??
    (typeof ambiguous?.responseJson.suspectedPostId === "string"
      ? ambiguous.responseJson.suspectedPostId
      : null);

  let found = false;
  let postId: string | null = null;
  let postUrl: string | null = null;
  let raw: Record<string, unknown> = {};

  if (mode === "test") {
    const sim = simulateTestReconcile({
      publicationId,
      channel: String(pub.channel),
      suspectedPostId: suspected,
      treatAsMissing: opts.treatAsMissing,
    });
    if (sim.ok) {
      found = true;
      postId = sim.postId;
      postUrl = sim.postUrl;
      raw = sim.raw;
    } else {
      found = false;
      raw = sim.raw;
    }
  } else if (pub.channel === "facebook_page" && suspected) {
    const lookup = await lookupFacebookPagePost(suspected);
    found = lookup.found;
    raw = lookup.raw;
    if (found) {
      postId = String(lookup.raw.id ?? suspected);
      postUrl =
        typeof lookup.raw.permalink_url === "string"
          ? lookup.raw.permalink_url
          : `https://www.facebook.com/${postId}`;
    }
  } else if (pub.channel === "instagram") {
    raw = {
      note: "Instagram reconcile requires media id lookup; day-1 scope is Facebook Page.",
    };
    found = false;
  } else {
    raw = { note: "No platform lookup available for this channel/mode" };
    found = Boolean(opts.treatAsMissing === false && suspected);
    if (found) {
      postId = suspected;
      postUrl = suspected;
    }
  }

  const finishedAt = nowIso();
  const idempotencyKey = `reconcile:${publicationId}:${ambiguous?.id ?? "none"}:${finishedAt}`;
  const attemptId = newId("att");

  getDb()
    .insert(publicationAttempts)
    .values({
      id: attemptId,
      publicationId,
      mode,
      outcome: found ? "success" : "failure",
      startedAt,
      finishedAt,
      errorMessage: found
        ? null
        : "Reconcile: post not found — safe to retry send",
      responseJson: JSON.stringify({ reconcile: true, ...raw }),
      platformPostId: postId,
      platformPostUrl: postUrl,
      idempotencyKey,
      reconciledFromAttemptId: ambiguous?.id ?? null,
      createdAt: finishedAt,
    })
    .run();

  if (found) {
    getDb()
      .update(publications)
      .set({
        status: "published",
        confirmationKind: mode === "connected" ? "platform" : "test",
        postUrl,
        externalId: postId,
        publishedAt: finishedAt,
        lastAttemptId: attemptId,
        updatedAt: finishedAt,
      })
      .where(eq(publications.id, publicationId))
      .run();

    const updated = getPublication(publicationId)!;
    handoffToAnalytics({
      publication: updated,
      confirmationKind: mode === "connected" ? "platform" : "test",
      postUrl,
      platformPostId: postId,
    });

    const attempt = rowToAttempt(
      getDb()
        .select()
        .from(publicationAttempts)
        .where(eq(publicationAttempts.id, attemptId))
        .get()!,
    );

    return {
      publication: updated,
      attempt,
      safeToRetry: false,
      message: "Reconcile found existing post — marked published, do not resend",
    };
  }

  getDb()
    .update(publications)
    .set({
      status: "failed",
      lastAttemptId: attemptId,
      updatedAt: finishedAt,
    })
    .where(eq(publications.id, publicationId))
    .run();

  const attempt = rowToAttempt(
    getDb()
      .select()
      .from(publicationAttempts)
      .where(eq(publicationAttempts.id, attemptId))
      .get()!,
  );

  return {
    publication: getPublication(publicationId)!,
    attempt,
    safeToRetry: true,
    message: "Reconcile found no post — safe to retry send",
  };
}
