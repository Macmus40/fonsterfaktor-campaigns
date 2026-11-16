import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ff-pub-"));
const dbPath = path.join(tmpDir, "campaigns.sqlite");

// Point DB at temp file before importing client modules.
process.chdir(
  // ensure cwd is repo root when run via npm test from root
  process.cwd(),
);

// Monkey-patch by env is not wired — write into data/ via renaming after import.
// Instead: delete and recreate through seed in isolation by setting cwd data path.
// We override getDbPath by writing to a dedicated data dir under tmp via symlink.

const repoData = path.join(process.cwd(), "data");
const repoDb = path.join(repoData, "campaigns.sqlite");
const backupDb = path.join(tmpDir, "backup-campaigns.sqlite");
if (fs.existsSync(repoDb)) fs.copyFileSync(repoDb, backupDb);
if (fs.existsSync(repoDb)) fs.unlinkSync(repoDb);
for (const side of ["-wal", "-shm"]) {
  const p = repoDb + side;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

let schedulePublication: typeof import("../src/lib/publications/service").schedulePublication;
let sendPublication: typeof import("../src/lib/publications/send").sendPublication;
let reconcilePublication: typeof import("../src/lib/publications/reconcile").reconcilePublication;
let buildManualPackage: typeof import("../src/lib/publications/manual-package").buildManualPackage;
let listAttempts: typeof import("../src/lib/publications/service").listAttempts;
let stockholmLocalToUtcIso: typeof import("../src/lib/time/stockholm").stockholmLocalToUtcIso;
let formatStockholm: typeof import("../src/lib/time/stockholm").formatStockholm;
let metaChannelCapabilities: typeof import("../src/lib/publications/meta/config").metaChannelCapabilities;

before(async () => {
  // Fresh modules against empty DB
  const seed = await import("../scripts/seed-demo");
  void seed;
  const { execSync } = await import("node:child_process");
  execSync("npx tsx scripts/seed-demo.ts", { stdio: "pipe" });

  ({
    schedulePublication,
    listAttempts,
  } = await import("../src/lib/publications/service"));
  ({ sendPublication } = await import("../src/lib/publications/send"));
  ({ reconcilePublication } = await import("../src/lib/publications/reconcile"));
  ({ buildManualPackage } = await import("../src/lib/publications/manual-package"));
  ({ stockholmLocalToUtcIso, formatStockholm } = await import(
    "../src/lib/time/stockholm"
  ));
  ({ metaChannelCapabilities } = await import(
    "../src/lib/publications/meta/config"
  ));
});

after(() => {
  // restore previous db if any
  for (const side of ["", "-wal", "-shm"]) {
    const p = repoDb + side;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  if (fs.existsSync(backupDb)) fs.copyFileSync(backupDb, repoDb);
});

test("Stockholm local converts and formats round-trip day", () => {
  const utc = stockholmLocalToUtcIso("2026-11-16T12:00");
  const label = formatStockholm(utc);
  assert.match(label, /^2026-11-16 12:00/);
});

test("schedules two channels and runs success + failure + retry", async () => {
  const { getDb } = await import("../src/lib/db/client");
  const { campaigns, contentVariants } = await import("../src/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const campaign = getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, "svart-skjutparti"))
    .get()!;
  const approved = getDb()
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.campaignId, campaign.id))
    .all()
    .find((v) => v.status === "approved")!;

  const fb = schedulePublication({
    campaignId: campaign.id,
    contentVariantId: approved.id,
    channel: "facebook_page",
    publishMode: "test",
    scheduledAtLocal: "2026-11-17T10:00",
  });
  const ig = schedulePublication({
    campaignId: campaign.id,
    contentVariantId: approved.id,
    channel: "instagram",
    publishMode: "test",
    scheduledAtLocal: "2026-11-17T14:00",
  });

  const ok = await sendPublication(fb.id, {
    force: "success",
    idempotencyKey: `t-ok-${fb.id}`,
  });
  assert.equal(ok.publication.status, "published");
  assert.equal(ok.publication.confirmationKind, "test");

  const fail = await sendPublication(ig.id, {
    force: "failure",
    idempotencyKey: `t-fail-${ig.id}`,
  });
  assert.equal(fail.publication.status, "failed");

  const retry = await sendPublication(ig.id, {
    force: "success",
    idempotencyKey: `t-retry-${ig.id}`,
  });
  assert.equal(retry.publication.status, "published");
  assert.ok(listAttempts(ig.id).length >= 2);
});

test("ambiguous blocks retry until reconcile", async () => {
  const { getDb } = await import("../src/lib/db/client");
  const { campaigns, contentVariants } = await import("../src/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const campaign = getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, "svart-skjutparti"))
    .get()!;
  const approved = getDb()
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.campaignId, campaign.id))
    .all()
    .find((v) => v.status === "approved")!;

  const pub = schedulePublication({
    campaignId: campaign.id,
    contentVariantId: approved.id,
    channel: "facebook_page",
    publishMode: "test",
    scheduledAtLocal: "2026-11-18T09:00",
  });

  await sendPublication(pub.id, {
    force: "ambiguous",
    idempotencyKey: `t-amb-${pub.id}`,
  });

  await assert.rejects(
    () =>
      sendPublication(pub.id, {
        force: "success",
        idempotencyKey: `t-amb-dup-${pub.id}`,
      }),
    /reconcile/i,
  );

  const resolved = await reconcilePublication(pub.id);
  assert.equal(resolved.publication.status, "published");
  assert.equal(resolved.safeToRetry, false);
});

test("manual package contains text, media, link", async () => {
  const { getDb } = await import("../src/lib/db/client");
  const { campaigns, contentVariants } = await import("../src/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const campaign = getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, "svart-skjutparti"))
    .get()!;
  const approved = getDb()
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.campaignId, campaign.id))
    .all()
    .find((v) => v.status === "approved")!;

  const pub = schedulePublication({
    campaignId: campaign.id,
    contentVariantId: approved.id,
    channel: "facebook_page",
    publishMode: "manual",
    scheduledAtLocal: "2026-11-18T12:00",
  });
  const pkg = buildManualPackage(pub.id);
  assert.ok(pkg.copyText.includes(pkg.headline));
  assert.ok(pkg.campaignLinkUrl.includes(`/r/${pkg.campaignLinkId}`));
  assert.ok(pkg.materials.length >= 1);
});

test("send rejects non-approved variants", async () => {
  const { getDb } = await import("../src/lib/db/client");
  const { campaigns, contentVariants } = await import("../src/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const campaign = getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, "svart-skjutparti"))
    .get()!;
  const draft = getDb()
    .select()
    .from(contentVariants)
    .where(eq(contentVariants.campaignId, campaign.id))
    .all()
    .find((v) => v.status === "draft")!;

  assert.throws(
    () =>
      schedulePublication({
        campaignId: campaign.id,
        contentVariantId: draft.id,
        channel: "facebook_page",
        publishMode: "test",
        scheduledAtLocal: "2026-11-19T10:00",
      }),
    /approved/i,
  );
});

test("meta channel statuses document FB day-1 and IG scope", () => {
  const channels = metaChannelCapabilities();
  const fb = channels.find((c) => c.channel === "facebook_page")!;
  const ig = channels.find((c) => c.channel === "instagram")!;
  assert.equal(fb.day1Priority, true);
  assert.equal(ig.day1Priority, false);
  assert.match(ig.status, /blocked_/);
});
