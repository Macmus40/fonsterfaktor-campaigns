import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { contentVariants, publicationAttempts, publications } from "@/lib/db/schema";
import { newId, nowIso } from "@/lib/id";
import { absoluteCampaignLinkUrl } from "@/lib/links/mint";
import { handoffToAnalytics } from "./analytics-handoff";
import { buildManualPackage } from "./manual-package";
import { rowToAttempt, rowToPublication } from "./mappers";
import { publishFacebookPagePost } from "./meta/facebook-page";
import { publishInstagramImage } from "./meta/instagram";
import { getPublication, listAttempts } from "./service";
import {
  simulateTestPublish,
  type TestPublishForce,
} from "./test-mode";
import type {
  ConfirmationKind,
  Publication,
  PublicationAttempt,
  PublishMode,
} from "@/lib/types";

export type SendOptions = {
  mode?: PublishMode;
  force?: TestPublishForce;
  idempotencyKey?: string;
  origin?: string;
};

export type SendResult = {
  publication: Publication;
  attempt: PublicationAttempt;
  blockedReason?: string;
};

function confirmationForMode(mode: PublishMode): ConfirmationKind {
  if (mode === "connected") return "platform";
  if (mode === "test") return "test";
  return "manual";
}

function assertCanSend(pub: Publication) {
  if (!pub.contentVariantId) {
    throw new Error("Publication missing content variant");
  }
  const variant = getDb()
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.id, pub.contentVariantId))
    .get();
  if (!variant || variant.status !== "approved") {
    throw new Error("Send blocked: content variant is not approved");
  }

  const ambiguous = listAttempts(pub.id).find((a) => a.outcome === "ambiguous");
  if (ambiguous && pub.status === "ambiguous") {
    throw new Error(
      "Send blocked: last result was ambiguous — call reconcile before retry to avoid duplicates",
    );
  }
}

function insertAttempt(opts: {
  publicationId: string;
  mode: PublishMode;
  outcome: PublicationAttempt["outcome"];
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  responseJson: Record<string, unknown>;
  platformPostId: string | null;
  platformPostUrl: string | null;
  idempotencyKey: string;
  reconciledFromAttemptId?: string | null;
}): PublicationAttempt {
  const db = getDb();
  const existing = db
    .select()
    .from(publicationAttempts)
    .where(eq(publicationAttempts.idempotencyKey, opts.idempotencyKey))
    .get();
  if (existing) return rowToAttempt(existing);

  const id = newId("att");
  const createdAt = nowIso();
  db.insert(publicationAttempts)
    .values({
      id,
      publicationId: opts.publicationId,
      mode: opts.mode,
      outcome: opts.outcome,
      startedAt: opts.startedAt,
      finishedAt: opts.finishedAt,
      errorMessage: opts.errorMessage,
      responseJson: JSON.stringify(opts.responseJson),
      platformPostId: opts.platformPostId,
      platformPostUrl: opts.platformPostUrl,
      idempotencyKey: opts.idempotencyKey,
      reconciledFromAttemptId: opts.reconciledFromAttemptId ?? null,
      createdAt,
    })
    .run();

  db.update(publications)
    .set({ lastAttemptId: id, updatedAt: nowIso() })
    .where(eq(publications.id, opts.publicationId))
    .run();

  const row = db
    .select()
    .from(publicationAttempts)
    .where(eq(publicationAttempts.id, id))
    .get();
  if (!row) throw new Error("Failed to persist attempt");
  return rowToAttempt(row);
}

function markPublication(
  publicationId: string,
  patch: Partial<{
    status: string;
    confirmationKind: string | null;
    postUrl: string | null;
    externalId: string | null;
    publishedAt: string | null;
  }>,
) {
  getDb()
    .update(publications)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(publications.id, publicationId))
    .run();
}

export async function sendPublication(
  publicationId: string,
  options: SendOptions = {},
): Promise<SendResult> {
  const pub = getPublication(publicationId);
  if (!pub) throw new Error("Publication not found");

  const mode = options.mode ?? pub.publishMode;
  assertCanSend(pub);

  if (mode === "manual") {
    throw new Error(
      "Manual mode has no automated send — use the manual package and register the post URL",
    );
  }

  const startedAt = nowIso();
  const idempotencyKey =
    options.idempotencyKey ?? `send:${publicationId}:${startedAt}`;

  markPublication(publicationId, { status: "publishing" });

  const origin = options.origin ?? "http://localhost:3000";
  const pkg = buildManualPackage(publicationId, origin);
  const message = pkg.copyText;

  let result:
    | {
        ok: true;
        postId: string;
        postUrl: string | null;
        raw: Record<string, unknown>;
      }
    | {
        ok: false;
        ambiguous: boolean;
        errorMessage: string;
        raw: Record<string, unknown>;
      };

  if (mode === "test") {
    result = simulateTestPublish({
      publicationId,
      channel: String(pub.channel),
      force: options.force,
      idempotencyKey,
    });
  } else if (pub.channel === "facebook_page") {
    result = await publishFacebookPagePost({
      message,
      link: pkg.campaignLinkUrl,
      imageUrl: pkg.materials.find((m) => m.kind === "image")?.url ?? null,
    });
  } else if (pub.channel === "instagram") {
    const image = pkg.materials.find((m) => m.kind === "image");
    if (!image) {
      result = {
        ok: false,
        ambiguous: false,
        errorMessage: "Instagram publish requires an image material",
        raw: {},
      };
    } else {
      const ig = await publishInstagramImage({
        caption: message,
        imageUrl: image.url.startsWith("http")
          ? image.url
          : `${origin}${image.url}`,
      });
      result = ig.ok
        ? {
            ok: true,
            postId: ig.mediaId,
            postUrl: ig.postUrl,
            raw: ig.raw,
          }
        : ig;
    }
  } else {
    result = {
      ok: false,
      ambiguous: false,
      errorMessage: `Connected mode does not support channel: ${pub.channel}`,
      raw: {},
    };
  }

  const finishedAt = nowIso();

  if (result.ok) {
    const attempt = insertAttempt({
      publicationId,
      mode,
      outcome: "success",
      startedAt,
      finishedAt,
      errorMessage: null,
      responseJson: result.raw,
      platformPostId: result.postId,
      platformPostUrl: result.postUrl,
      idempotencyKey,
    });
    const confirmationKind = confirmationForMode(mode);
    markPublication(publicationId, {
      status: "published",
      confirmationKind,
      postUrl: result.postUrl,
      externalId: result.postId,
      publishedAt: finishedAt,
    });
    const updated = getPublication(publicationId)!;
    handoffToAnalytics({
      publication: updated,
      confirmationKind,
      postUrl: result.postUrl,
      platformPostId: result.postId,
    });
    return { publication: updated, attempt };
  }

  if (result.ambiguous) {
    const attempt = insertAttempt({
      publicationId,
      mode,
      outcome: "ambiguous",
      startedAt,
      finishedAt,
      errorMessage: result.errorMessage,
      responseJson: result.raw,
      platformPostId:
        typeof result.raw.suspectedPostId === "string"
          ? result.raw.suspectedPostId
          : null,
      platformPostUrl: null,
      idempotencyKey,
    });
    markPublication(publicationId, { status: "ambiguous" });
    return {
      publication: getPublication(publicationId)!,
      attempt,
      blockedReason: result.errorMessage,
    };
  }

  const attempt = insertAttempt({
    publicationId,
    mode,
    outcome: "failure",
    startedAt,
    finishedAt,
    errorMessage: result.errorMessage,
    responseJson: result.raw,
    platformPostId: null,
    platformPostUrl: null,
    idempotencyKey,
  });
  markPublication(publicationId, { status: "failed" });
  return {
    publication: getPublication(publicationId)!,
    attempt,
    blockedReason: result.errorMessage,
  };
}

export { absoluteCampaignLinkUrl };
