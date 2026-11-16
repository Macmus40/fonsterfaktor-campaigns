import type { publications, publicationAttempts } from "@/lib/db/schema";
import type { Publication, PublicationAttempt } from "@/lib/types";

export function rowToPublication(
  row: typeof publications.$inferSelect,
): Publication {
  let materialIds: string[] = [];
  try {
    materialIds = JSON.parse(row.materialIdsJson || "[]") as string[];
  } catch {
    materialIds = [];
  }
  return {
    id: row.id,
    campaignId: row.campaignId,
    channel: row.channel,
    externalId: row.externalId,
    contentVariantId: row.contentVariantId,
    materialIds,
    status: row.status as Publication["status"],
    scheduledAt: row.scheduledAt,
    publishMode: (row.publishMode || "manual") as Publication["publishMode"],
    confirmationKind: (row.confirmationKind ||
      null) as Publication["confirmationKind"],
    postUrl: row.postUrl,
    campaignLinkId: row.campaignLinkId,
    lastAttemptId: row.lastAttemptId,
    publishedAt: row.publishedAt,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function rowToAttempt(
  row: typeof publicationAttempts.$inferSelect,
): PublicationAttempt {
  let responseJson: Record<string, unknown> = {};
  try {
    responseJson = JSON.parse(row.responseJson || "{}") as Record<
      string,
      unknown
    >;
  } catch {
    responseJson = {};
  }
  return {
    id: row.id,
    publicationId: row.publicationId,
    mode: row.mode as PublicationAttempt["mode"],
    outcome: row.outcome as PublicationAttempt["outcome"],
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    errorMessage: row.errorMessage,
    responseJson,
    platformPostId: row.platformPostId,
    platformPostUrl: row.platformPostUrl,
    idempotencyKey: row.idempotencyKey,
    reconciledFromAttemptId: row.reconciledFromAttemptId,
    createdAt: row.createdAt,
  };
}
