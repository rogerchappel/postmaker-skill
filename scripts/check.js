#!/usr/bin/env node
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const required = [
  "README.md",
  "SKILL.md",
  "docs/PRD.md",
  "docs/TASKS.md",
  "docs/ORCHESTRATION.md",
  "docs/RELEASE_CANDIDATE.md",
  "fixtures/release-evidence.json",
  "src/index.js",
  "bin/postmaker-skill.js",
  "test/index.test.js"
];

for (const file of required) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

execFileSync(process.execPath, ["--check", "src/index.js"], { stdio: "inherit" });
console.log("postmaker-skill check passed");
