import assert from "node:assert/strict";
import test from "node:test";
import {
  channelCaption,
  defaultHashtags,
  moveItem,
  normalizeHashtag,
  parseHashtagInput,
  slidesForPost,
  uniqueHashtags,
} from "../src/lib/campaigns/post-copy";
import { flattenExtended, generateTemplateProposals } from "../src/lib/campaigns/swedish-templates";

test("normalizeHashtag keeps Swedish letters and rejects junk", () => {
  assert.equal(normalizeHashtag("  #Fönster "), "#Fönster");
  assert.equal(normalizeHashtag("eget mått"), "#egetmått");
  assert.equal(normalizeHashtag("pris!"), null);
  assert.equal(normalizeHashtag("#"), null);
});

test("parseHashtagInput splits a pasted line and drops invalid tokens", () => {
  const parsed = parseHashtagInput("#fönster, pris! #drutex");
  assert.deepEqual(parsed.tags, ["#fönster", "#drutex"]);
  assert.deepEqual(parsed.invalid, ["pris!"]);
});

test("uniqueHashtags ignores case duplicates", () => {
  assert.deepEqual(uniqueHashtags(["#Hem", "#hem", "#HEM"]), ["#Hem"]);
});

test("moveItem reorders without mutating the source", () => {
  const source = ["a", "b", "c"];
  assert.deepEqual(moveItem(source, 0, 2), ["b", "c", "a"]);
  assert.deepEqual(source, ["a", "b", "c"]);
});

test("slidesForPost uses an explicit order and can be empty", () => {
  const materials = [
    { id: "m1", kind: "image" as const, url: "/a.jpg", title: "A" },
    { id: "m2", kind: "video" as const, url: "/b.mp4", title: "B" },
  ];
  const ordered = slidesForPost(
    {
      kind: "image",
      headline: "h",
      postText: "p",
      carouselCaptions: [],
      cta: "c",
      slideIds: ["m2", "m1", "missing"],
    },
    "m1",
    materials,
  );
  assert.deepEqual(
    ordered.map((slide) => slide.id),
    ["m2", "m1"],
  );
  assert.equal(ordered[0]?.kind, "video");

  const cleared = slidesForPost(
    {
      kind: "image",
      headline: "h",
      postText: "p",
      carouselCaptions: [],
      cta: "c",
      slideIds: [],
    },
    "m1",
    materials,
  );
  assert.equal(cleared.length, 0);
});

test("generated Swedish posts include a slogan and hashtags in the flat caption", () => {
  const [price, season] = generateTemplateProposals({
    product: "Drutex skjutparti",
    goal: "Fler förfrågningar",
    destinationUrl: "https://example.test/konfigurator",
    materialKind: "image",
    materialTitle: "Fasad",
    context: { priceText: "18 900 kr", season: "vinter" },
  });
  assert.ok(price);
  assert.ok(season);
  assert.match(price.headline, /Drutex skjutparti/);
  assert.match(price.body, /#fönster/);
  assert.match(price.body, /#egetmått/);
  assert.match(season.body, /#energieffektivt/);
  assert.ok(price.extended.kind === "image" && price.extended.slogan);
  assert.ok(defaultHashtags("Drutex skjutparti", "price_custom").includes("#drutex"));
});

test("flattenExtended keeps older posts without hashtags unchanged in the body", () => {
  const flat = flattenExtended(
    {
      kind: "image",
      headline: "Rubrik",
      postText: "Bara brödtext.",
      carouselCaptions: [],
      cta: "Öppna",
    },
    "Öppna",
  );
  assert.equal(flat.headline, "Rubrik");
  assert.equal(flat.body, "Bara brödtext.");
  assert.equal(flat.cta, "Öppna");
});

test("channelCaption puts hashtags after the post text", () => {
  assert.equal(channelCaption("Hej.", ["#fönster", "#fönster"]), "Hej.\n\n#fönster");
});
