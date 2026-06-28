import test from "node:test";
import assert from "node:assert/strict";
import { makeLaunchPack, renderMarkdown, validateEvidence } from "../src/index.js";

test("generates launch, technical, and demo posts from evidence", () => {
  const pack = makeLaunchPack({
    project: "demo-skill",
    audience: "release agents",
    changes: ["captures repo evidence", "writes launch copy"],
    verification: [{ command: "npm test", result: "passed" }],
    sources: [{ path: "README.md", summary: "usage" }]
  });

  assert.equal(pack.posts.launch.includes("demo-skill"), true);
  assert.equal(pack.posts.technical.includes("captures repo evidence"), true);
  assert.equal(pack.posts.demoCaption.includes("captures repo evidence"), true);
  assert.deepEqual(pack.warnings, []);
});

test("flags unsupported requested claims", () => {
  const warnings = validateEvidence({
    project: "demo-skill",
    audience: "release agents",
    changes: ["writes launch copy"],
    verification: ["npm test"],
    sources: [],
    requestedClaims: ["SOC2 certified"]
  });

  assert.equal(warnings.includes("Unsupported requested claim: SOC2 certified"), true);
});

test("renders markdown with limitations and warnings", () => {
  const markdown = renderMarkdown(makeLaunchPack({
    project: "demo-skill",
    audience: "release agents",
    changes: ["writes launch copy"],
    verification: [],
    limitations: ["dry-run only"]
  }));

  assert.equal(markdown.includes("## Limitations"), true);
  assert.equal(markdown.includes("Missing required evidence: verification"), true);
});
