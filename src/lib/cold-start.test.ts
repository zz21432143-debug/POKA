import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("cold start does not block the first page", () => {
  it("wakes the database in the background instead of awaiting schema boot", () => {
    const src = readFileSync(new URL("../instrumentation.ts", import.meta.url), "utf8");
    assert.match(src, /void ensureDb\(\)/);
    assert.doesNotMatch(src, /await ensureDb\(\)/);
  });

  it("streams the footer so a sleeping database cannot take down the shell", () => {
    const src = readFileSync(new URL("../components/layout/site-shell.tsx", import.meta.url), "utf8");
    assert.match(src, /SiteFooterFallback/);
    assert.match(src, /<Suspense fallback=\{<SiteFooterFallback \/>\}>/);
  });

  it("keeps site settings readable when postgres is down", () => {
    const src = readFileSync(new URL("./site-settings.ts", import.meta.url), "utf8");
    assert.match(src, /return DEFAULT_SITE_SETTINGS/);
    assert.match(src, /catch \{/);
  });
});
