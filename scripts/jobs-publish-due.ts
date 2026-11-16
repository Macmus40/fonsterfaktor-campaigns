/**
 * Local runner for scheduled publications (same code as Vercel Cron).
 *
 *   ALLOW_UNAUTHENTICATED_CRON=true PUBLISH_JOB_MODE=simulate npm run jobs:publish-due
 *   # or against a running server:
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/jobs/publish-due
 */
import { runPublishDueJob } from "../src/lib/jobs/publish-due";

async function main() {
  process.env.PUBLISH_JOB_MODE =
    process.env.PUBLISH_JOB_MODE ?? "simulate";
  const result = await runPublishDueJob();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
