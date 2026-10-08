import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { loginHref } from "./login-path";

describe("back navigation", () => {
  it("marks helpers as never so pages typecheck after replace", () => {
    const src = readFileSync(new URL("./history-redirect.ts", import.meta.url), "utf8");
    assert.match(src, /export function replaceTo\(path: string\): never/);
    assert.match(src, /export function replaceToLogin\(next = "\/"\): never/);
  });

  it("keeps login next paths in-app", () => {
    assert.equal(loginHref("/posts/abc"), "/login?next=%2Fposts%2Fabc");
  });

  it("lets the service worker skip document navigations so Back works", () => {
    const sw = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
    assert.match(sw, /request\.mode === "navigate"/);
    assert.match(sw, /poka-pwa-v2/);
    assert.doesNotMatch(sw, /caches\.match\("\/"\)/);
  });

  it("write success replaces the form so Back does not return to it", () => {
    const files = [
      "src/components/posts/board-write-form.tsx",
      "src/components/hand/hand-editor.tsx",
      "src/components/promo/official-promo-form.tsx",
      "src/components/jobs/job-write-form.tsx",
      "src/components/listing/hire-form.tsx",
      "src/components/listing/schedule-form.tsx",
      "src/components/listing/board-listing-form.tsx",
    ];
    for (const file of files) {
      const src = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
      assert.doesNotMatch(src, /router\.push\(`\/posts\//, file);
      assert.match(src, /router\.replace\(`\/posts\//, file);
    }
  });
});
