import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { makeLaunchPack, readEvidence, renderMarkdown, validateEvidence } from "../src/index.js";

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

test("validates raw verification records through the public API", () => {
  const warnings = validateEvidence({
    project: "demo-skill",
    audience: "release agents",
    changes: ["writes launch copy"],
    verification: [
      { command: "npm test", result: "failed" },
      { command: "npm run build" }
    ],
    sources: [],
    requestedClaims: []
  });

  assert.deepEqual(warnings, [
    "Failed verification: npm test (failed)",
    "Malformed verification record at index 1: command and result are required"
  ]);
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

test("qualifies launch copy with passing fixture verification", () => {
  const pack = makeLaunchPack(readEvidence("fixtures/release-evidence.json"));

  assert.match(pack.posts.launch, /Verified with npm test \(passed\)/);
  assert.equal(pack.warnings.some((warning) => warning.includes("verification")), false);
});

test("does not claim failed fixture verification succeeded", () => {
  const pack = makeLaunchPack(readEvidence("fixtures/failed-verification.json"));

  assert.doesNotMatch(pack.posts.launch, /Verified with/);
  assert.match(pack.posts.launch, /Verification requires review/);
  assert.deepEqual(pack.warnings, ["Failed verification: npm test (failed)"]);
});

test("warns for every malformed fixture verification record", () => {
  const pack = makeLaunchPack(readEvidence("fixtures/malformed-verification.json"));

  assert.doesNotMatch(pack.posts.launch, /Verified with/);
  assert.deepEqual(pack.warnings, [
    "Malformed verification record at index 0: command and result are required",
    "Malformed verification record at index 1: command and result are required"
  ]);
});

test("standalone help exits successfully", () => {
  const result = spawnSync(process.execPath, ["bin/postmaker-skill.js", "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.equal(result.stderr, "");
});

test("CLI accepts explicit supported formats", () => {
  const json = execFileSync(process.execPath, [
    "bin/postmaker-skill.js",
    "fixtures/release-evidence.json",
    "--format",
    "json"
  ], { encoding: "utf8" });
  const markdown = execFileSync(process.execPath, [
    "bin/postmaker-skill.js",
    "fixtures/release-evidence.json",
    "--format",
    "markdown"
  ], { encoding: "utf8" });

  assert.equal(JSON.parse(json).project, "repo-to-content-skill");
  assert.match(markdown, /^# repo-to-content-skill Launch Pack/m);
});

test("CLI rejects missing and unsupported format values explicitly", () => {
  const missing = spawnSync(process.execPath, [
    "bin/postmaker-skill.js",
    "fixtures/release-evidence.json",
    "--format"
  ], { encoding: "utf8" });
  const unsupported = spawnSync(process.execPath, [
    "bin/postmaker-skill.js",
    "fixtures/release-evidence.json",
    "--format",
    "html"
  ], { encoding: "utf8" });

  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Missing value for --format/);
  assert.equal(unsupported.status, 1);
  assert.match(unsupported.stderr, /Unsupported format: html/);
});

test("CLI returns non-success for failed and malformed verification fixtures", () => {
  for (const fixture of ["failed-verification.json", "malformed-verification.json"]) {
    const result = spawnSync(process.execPath, [
      "bin/postmaker-skill.js",
      `fixtures/${fixture}`
    ], { encoding: "utf8" });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Verification evidence is not publishable/);
    assert.doesNotMatch(result.stdout, /Verified with/);
  }
});
