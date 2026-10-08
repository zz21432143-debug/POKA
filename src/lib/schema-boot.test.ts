import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SCHEMA_BOOT_ID, SCHEMA_BOOT_KIND, SCHEMA_BOOT_VERSION, isCurrentSchemaBoot } from "./schema-boot";

describe("schema boot marker", () => {
  it("pins a stable audit id so cold starts can skip ALTER storms", () => {
    assert.equal(SCHEMA_BOOT_KIND, "SCHEMA_BOOT");
    assert.equal(SCHEMA_BOOT_VERSION, "1");
    assert.equal(SCHEMA_BOOT_ID, "schema_boot_v1");
    assert.equal(isCurrentSchemaBoot("1"), true);
    assert.equal(isCurrentSchemaBoot("0"), false);
  });
});
