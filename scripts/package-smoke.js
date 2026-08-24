#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8"
});
const [pack] = JSON.parse(output);
const files = new Set(pack.files.map((file) => file.path));

const required = [
  "bin/postmaker-skill.js",
  "src/index.js",
  "fixtures/release-evidence.json",
  "SKILL.md",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md"
];

const missing = required.filter((file) => !files.has(file));
if (missing.length) {
  console.error(`Package smoke failed; missing files:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log(`package smoke ok: ${pack.filename} includes ${pack.files.length} files`);

const consumer = mkdtempSync(join(tmpdir(), "postmaker-skill-consumer-"));
try {
  const [artifact] = JSON.parse(execFileSync("npm", ["pack", "--json", "--pack-destination", consumer], {
    encoding: "utf8"
  }));
  const tarball = resolve(consumer, artifact.filename);
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], {
    cwd: consumer,
    stdio: "pipe"
  });
  execFileSync(process.execPath, ["--input-type=module", "--eval",
    'import { validateEvidence } from "postmaker-skill"; if (typeof validateEvidence !== "function") process.exit(1);'
  ], { cwd: consumer, stdio: "pipe" });
  execFileSync(join(consumer, "node_modules", ".bin", "postmaker-skill"), ["--help"], {
    cwd: consumer,
    stdio: "pipe"
  });
  console.log("installed package smoke ok: root import and CLI are available");
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
