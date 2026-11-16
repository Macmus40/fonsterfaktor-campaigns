import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyUserAgent } from "../src/lib/links/bots";
import { buildRedirectDestination } from "../src/lib/links/destination";
import { stripContactFields } from "../src/lib/events/sanitize";

describe("bot / preview detection", () => {
  it("flags facebookexternalhit as link_preview", () => {
    const r = classifyUserAgent("facebookexternalhit/1.1");
    assert.equal(r.isBot, true);
    assert.equal(r.kind, "link_preview");
  });

  it("treats normal browsers as human", () => {
    const r = classifyUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    );
    assert.equal(r.isBot, false);
    assert.equal(r.kind, "human");
  });
});

describe("redirect destination", () => {
  it("preserves product params and adds ff_link_id", () => {
    const url = buildRedirectDestination({
      destinationUrl:
        "https://example.test/konfigurator?product=skjutparti&finish=svart&campaign=svart-skjutparti",
      linkId: "lnk_test",
      publicationId: "pub_test",
      contentVariantLabel: "A",
      utm: { utm_source: "facebook", utm_campaign: "svart-skjutparti" },
    });
    const u = new URL(url);
    assert.equal(u.searchParams.get("product"), "skjutparti");
    assert.equal(u.searchParams.get("finish"), "svart");
    assert.equal(u.searchParams.get("ff_link_id"), "lnk_test");
    assert.equal(u.searchParams.get("ff_variant"), "A");
  });
});

describe("contact sanitize", () => {
  it("strips email/phone but keeps inquiryId", () => {
    const out = stripContactFields({
      email: "a@b.c",
      phone: "+46…",
      inquiryId: "inq_1",
      priceSek: 1,
    });
    assert.equal(out.email, undefined);
    assert.equal(out.phone, undefined);
    assert.equal(out.inquiryId, "inq_1");
    assert.equal(out.priceSek, 1);
  });
});
