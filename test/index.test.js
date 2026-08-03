import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  EvidenceValidationError,
  makeLaunchPack,
  normalizeEvidence,
  readEvidence,
  renderMarkdown,
  validateEvidence
} from "../src/index.js";

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

test("validates minimal evidence without optional collections", () => {
  const evidence = {
    project: "demo-skill",
    audience: "release agents",
    changes: ["writes launch copy"],
    verification: [{ command: "npm test", result: "passed" }]
  };

  assert.deepEqual(validateEvidence(evidence), []);
  assert.deepEqual(validateEvidence(evidence), normalizeEvidence(evidence).warnings);
});

test("direct validation returns deterministic warnings for incomplete collections", () => {
  assert.deepEqual(validateEvidence({ project: "demo-skill", audience: "release agents" }), [
    "Missing required evidence: changes",
    "Missing required evidence: verification"
  ]);
  assert.deepEqual(validateEvidence({
    project: "demo-skill",
    audience: "release agents",
    changes: "writes launch copy",
    verification: {},
    sources: null,
    requestedClaims: "fast"
  }), [
    "Malformed evidence: changes must be an array",
    "Malformed evidence: verification must be an array",
    "Malformed evidence: sources must be an array",
    "Malformed evidence: requestedClaims must be an array"
  ]);
});

test("fixture-backed direct validation diagnoses every invalid field without throwing", () => {
  const evidence = JSON.parse(fs.readFileSync("fixtures/direct-validation-invalid.json", "utf8"));

  assert.deepEqual(validateEvidence(evidence), [
    "Malformed evidence: project must be a non-empty string",
    "Malformed evidence: audience must be a non-empty string",
    "Malformed evidence: changes[1] must be a non-empty string",
    "Malformed evidence: changes[2] must be a non-empty string",
    "Malformed evidence: limitations[0] must be a non-empty string",
    "Malformed evidence: requestedClaims[0] must be a non-empty string",
    "Malformed evidence: sources[0].path must be a non-empty string",
    "Malformed evidence: sources[1].summary must be a non-empty string when provided",
    "Malformed verification record at index 1: command and result are required",
    "Malformed verification record at index 2: command and result are required"
  ]);
});

test("fixture-backed direct validation accepts valid evidence", () => {
  const evidence = JSON.parse(fs.readFileSync("fixtures/direct-validation-valid.json", "utf8"));

  assert.deepEqual(validateEvidence(evidence), []);
});

test("renders markdown with limitations and warnings", () => {
  const markdown = renderMarkdown(makeLaunchPack({
    project: "demo-skill",
    audience: "release agents",
    changes: ["writes launch copy"],
    verification: [{ command: "npm test", result: "passed" }],
    limitations: ["dry-run only"]
  }));

  assert.equal(markdown.includes("## Limitations"), true);
  assert.equal(markdown.includes("- dry-run only"), true);
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

test("fixture-backed API errors identify each missing required field", () => {
  for (const field of ["project", "audience", "changes", "verification"]) {
    assert.throws(
      () => readEvidence(`fixtures/missing-${field}.json`),
      (error) => error instanceof EvidenceValidationError && error.message.includes(field)
    );
  }
});

test("API rejects invalid evidence root and field shapes", () => {
  const valid = {
    project: "demo-skill",
    audience: "release agents",
    changes: ["writes launch copy"],
    verification: [{ command: "npm test", result: "passed" }]
  };
  const invalid = [
    [null, "root must be a JSON object"],
    [[], "root must be a JSON object"],
    [{ ...valid, project: "  " }, "project must be a non-empty string"],
    [{ ...valid, audience: 42 }, "audience must be a non-empty string"],
    [{ ...valid, changes: "shipped" }, "changes must be an array"],
    [{ ...valid, changes: ["ok", ""] }, "changes[1] must be a non-empty string"],
    [{ ...valid, verification: {} }, "verification must be an array"],
    [{ ...valid, limitations: [false] }, "limitations[0] must be a non-empty string"],
    [{ ...valid, requestedClaims: "fast" }, "requestedClaims must be an array"],
    [{ ...valid, sources: [null] }, "sources[0] must be a non-empty string or source object"],
    [{ ...valid, sources: [{ path: " " }] }, "sources[0].path must be a non-empty string"],
    [{ ...valid, sources: [{ path: "README.md", summary: 3 }] },
      "sources[0].summary must be a non-empty string when provided"]
  ];

  for (const [input, diagnostic] of invalid) {
    assert.throws(
      () => normalizeEvidence(input),
      (error) => error instanceof EvidenceValidationError && error.message.includes(diagnostic)
    );
  }
  assert.equal(normalizeEvidence(valid).project, "demo-skill");
});

test("fully valid fixture has no required-evidence warnings", () => {
  const pack = makeLaunchPack(readEvidence("fixtures/release-evidence.json"));

  assert.equal(pack.warnings.some((warning) =>
    warning.startsWith("Missing required evidence:")), false);
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

test("CLI rejects missing required fields without rendering a draft", () => {
  for (const field of ["project", "audience", "changes", "verification"]) {
    const result = spawnSync(process.execPath, [
      "bin/postmaker-skill.js",
      `fixtures/missing-${field}.json`
    ], { encoding: "utf8" });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, new RegExp(`Invalid evidence: ${field}`));
  }
});

test("CLI rejects malformed evidence types without a stack trace or draft", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "postmaker-invalid-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const valid = {
    project: "demo-skill",
    audience: "release agents",
    changes: ["writes launch copy"],
    verification: [{ command: "npm test", result: "passed" }]
  };
  const cases = [
    [null, "root must be a JSON object"],
    [[], "root must be a JSON object"],
    [{ ...valid, project: {} }, "project must be a non-empty string"],
    [{ ...valid, changes: [42] }, "changes[0] must be a non-empty string"],
    [{ ...valid, limitations: "none" }, "limitations must be an array"],
    [{ ...valid, requestedClaims: [" "] }, "requestedClaims[0] must be a non-empty string"],
    [{ ...valid, sources: [{ summary: "missing path" }] },
      "sources[0].path must be a non-empty string"]
  ];

  cases.forEach(([input, diagnostic], index) => {
    const fixture = path.join(directory, `${index}.json`);
    fs.writeFileSync(fixture, JSON.stringify(input));
    const result = spawnSync(process.execPath, ["bin/postmaker-skill.js", fixture], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, new RegExp(diagnostic.replace(/[\[\]]/g, "\\$&")));
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  });
});

test("CLI reports an unreadable evidence file without a stack trace or draft", () => {
  const fixture = path.join(os.tmpdir(), "postmaker-missing-evidence.json");
  const result = spawnSync(process.execPath, ["bin/postmaker-skill.js", fixture], {
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, new RegExp(`Unable to read evidence file: ${fixture}`));
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test("CLI reports invalid JSON without a stack trace or draft", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "postmaker-invalid-json-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const fixture = path.join(directory, "evidence.json");
  fs.writeFileSync(fixture, '{"project":');

  const result = spawnSync(process.execPath, ["bin/postmaker-skill.js", fixture], {
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, new RegExp(`Invalid JSON in evidence file: ${fixture}`));
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test("CLI returns success for fully valid evidence", () => {
  const result = spawnSync(process.execPath, [
    "bin/postmaker-skill.js",
    "fixtures/release-evidence.json"
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.equal(JSON.parse(result.stdout).warnings.some((warning) =>
    warning.startsWith("Missing required evidence:")), false);
});
