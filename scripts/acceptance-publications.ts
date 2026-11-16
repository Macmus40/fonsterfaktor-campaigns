/**
 * Acceptance: schedule two channels, success + failure test sends,
 * reconcile/retry, and build a manual package.
 *
 * Usage: npx tsx scripts/acceptance-publications.ts
 */
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, getDbPath } from "../src/lib/db/client";
import { campaigns, contentVariants } from "../src/lib/db/schema";
import { metaChannelCapabilities } from "../src/lib/publications/meta/config";
import { buildManualPackage } from "../src/lib/publications/manual-package";
import { reconcilePublication } from "../src/lib/publications/reconcile";
import { sendPublication } from "../src/lib/publications/send";
import {
  getPublication,
  listAttempts,
  schedulePublication,
} from "../src/lib/publications/service";
import { formatStockholm, STOCKHOLM_TZ } from "../src/lib/time/stockholm";

async function ensureDemo() {
  // Re-run seed script logic if empty
  const { execSync } = await import("node:child_process");
  const count = getDb().select().from(campaigns).all().length;
  if (count === 0) {
    execSync("npx tsx scripts/seed-demo.ts", { stdio: "inherit" });
  }
}

async function main() {
  // Isolate acceptance DB
  process.env.CAMPAIGNS_DB_PATH = undefined;
  const dbFile = getDbPath();
  if (fs.existsSync(dbFile)) {
    // keep existing demo; seed is idempotent
  }

  await ensureDemo();
  const db = getDb();
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, "svart-skjutparti"))
    .get();
  if (!campaign) throw new Error("Demo campaign missing");

  const approved = db
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.campaignId, campaign.id))
    .all()
    .find((v) => v.status === "approved");
  if (!approved) throw new Error("Approved variant missing");

  const day = formatStockholm(new Date()).slice(0, 10);

  const fb = schedulePublication({
    campaignId: campaign.id,
    contentVariantId: approved.id,
    channel: "facebook_page",
    publishMode: "test",
    scheduledAtLocal: `${day}T11:00`,
  });

  const ig = schedulePublication({
    campaignId: campaign.id,
    contentVariantId: approved.id,
    channel: "instagram",
    publishMode: "test",
    scheduledAtLocal: `${day}T15:30`,
  });

  const manual = schedulePublication({
    campaignId: campaign.id,
    contentVariantId: approved.id,
    channel: "facebook_page",
    publishMode: "manual",
    scheduledAtLocal: `${day}T18:00`,
  });

  const success = await sendPublication(fb.id, {
    force: "success",
    idempotencyKey: `accept-success-${fb.id}`,
  });

  const failure = await sendPublication(ig.id, {
    force: "failure",
    idempotencyKey: `accept-fail-${ig.id}`,
  });

  // Retry after failure
  const retry = await sendPublication(ig.id, {
    force: "success",
    idempotencyKey: `accept-retry-${ig.id}`,
  });

  // Ambiguous → reconcile → no duplicate
  const ambiguousPub = schedulePublication({
    campaignId: campaign.id,
    contentVariantId: approved.id,
    channel: "facebook_page",
    publishMode: "test",
    scheduledAtLocal: `${day}T19:00`,
  });
  const ambiguous = await sendPublication(ambiguousPub.id, {
    force: "ambiguous",
    idempotencyKey: `accept-amb-${ambiguousPub.id}`,
  });
  let blockedRetry: string | null = null;
  try {
    await sendPublication(ambiguousPub.id, {
      force: "success",
      idempotencyKey: `accept-amb-dup-${ambiguousPub.id}`,
    });
  } catch (err) {
    blockedRetry = err instanceof Error ? err.message : String(err);
  }
  const reconciled = await reconcilePublication(ambiguousPub.id);

  const pkg = buildManualPackage(manual.id, "http://localhost:3000");
  const channels = metaChannelCapabilities();

  const report = {
    timezone: STOCKHOLM_TZ,
    db: dbFile,
    scheduled: {
      facebook_page: {
        id: fb.id,
        scheduledAtStockholm: formatStockholm(fb.scheduledAt!),
        statusAfterSuccess: success.publication.status,
        confirmationKind: success.publication.confirmationKind,
        postUrl: success.publication.postUrl,
        attempts: listAttempts(fb.id).map((a) => a.outcome),
      },
      instagram: {
        id: ig.id,
        scheduledAtStockholm: formatStockholm(ig.scheduledAt!),
        statusAfterFailure: failure.publication.status,
        statusAfterRetry: retry.publication.status,
        confirmationKind: retry.publication.confirmationKind,
        attempts: listAttempts(ig.id).map((a) => a.outcome),
      },
      manual: {
        id: manual.id,
        package: {
          headline: pkg.headline,
          campaignLinkUrl: pkg.campaignLinkUrl,
          materials: pkg.materials.map((m) => ({
            title: m.title,
            kind: m.kind,
            url: m.url,
          })),
          copyTextChars: pkg.copyText.length,
        },
      },
      ambiguousFlow: {
        id: ambiguousPub.id,
        ambiguousOutcome: ambiguous.attempt.outcome,
        blockedRetry,
        reconcileMessage: reconciled.message,
        safeToRetryWas: reconciled.safeToRetry,
        finalStatus: getPublication(ambiguousPub.id)?.status,
      },
    },
    metaChannelStatus: channels,
  };

  const outDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "acceptance-publications.json");
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
