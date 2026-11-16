/**
 * Deterministic test-mode publisher.
 * Force outcomes via `force` or by embedding keywords in the idempotency key:
 *   - contains "fail" → failure
 *   - contains "ambiguous" → ambiguous
 *   - otherwise → success
 */

export type TestPublishForce = "success" | "failure" | "ambiguous";

export type TestPublishResult =
  | {
      ok: true;
      postId: string;
      postUrl: string;
      raw: Record<string, unknown>;
    }
  | {
      ok: false;
      ambiguous: boolean;
      errorMessage: string;
      raw: Record<string, unknown>;
    };

export function simulateTestPublish(opts: {
  publicationId: string;
  channel: string;
  force?: TestPublishForce;
  idempotencyKey?: string;
}): TestPublishResult {
  const key = (opts.idempotencyKey ?? "").toLowerCase();
  const force =
    opts.force ??
    (key.includes("ambiguous")
      ? "ambiguous"
      : key.includes("fail")
        ? "failure"
        : "success");

  if (force === "failure") {
    return {
      ok: false,
      ambiguous: false,
      errorMessage: `Simulated ${opts.channel} send failure (test mode)`,
      raw: { simulated: true, force },
    };
  }

  if (force === "ambiguous") {
    return {
      ok: false,
      ambiguous: true,
      errorMessage: `Simulated ambiguous ${opts.channel} result — reconcile before retry`,
      raw: {
        simulated: true,
        force,
        suspectedPostId: `test_suspected_${opts.publicationId}`,
      },
    };
  }

  const postId = `test_${opts.channel}_${opts.publicationId.slice(0, 8)}`;
  return {
    ok: true,
    postId,
    postUrl: `https://example.test/posts/${postId}`,
    raw: { simulated: true, force: "success" },
  };
}

/** Resolve a previously ambiguous test send without creating a duplicate. */
export function simulateTestReconcile(opts: {
  publicationId: string;
  channel: string;
  suspectedPostId?: string | null;
  /** When true, pretend the post never landed. */
  treatAsMissing?: boolean;
}): TestPublishResult {
  if (opts.treatAsMissing) {
    return {
      ok: false,
      ambiguous: false,
      errorMessage: "Reconcile: no post found on platform (safe to retry)",
      raw: { simulated: true, reconcile: true, found: false },
    };
  }
  const postId =
    opts.suspectedPostId ?? `test_${opts.channel}_${opts.publicationId.slice(0, 8)}`;
  return {
    ok: true,
    postId,
    postUrl: `https://example.test/posts/${postId}`,
    raw: { simulated: true, reconcile: true, found: true },
  };
}
