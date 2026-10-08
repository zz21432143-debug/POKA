import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { preferNeonPooler } from "./db-url";

describe("neon pooler url", () => {
  it("inserts -pooler into a Neon compute host", () => {
    const input = "postgresql://u:p@ep-abc-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
    assert.equal(
      preferNeonPooler(input),
      "postgresql://u:p@ep-abc-123-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
    );
  });

  it("leaves an existing pooler host and localhost alone", () => {
    const pooled = "postgresql://u:p@ep-abc-123-pooler.ap-southeast-1.aws.neon.tech/neondb";
    assert.equal(preferNeonPooler(pooled), pooled);
    assert.equal(preferNeonPooler("postgres://poka@localhost:51214/template1"), "postgres://poka@localhost:51214/template1");
  });
});
