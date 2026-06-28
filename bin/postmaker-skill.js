#!/usr/bin/env node
import { makeLaunchPack, readEvidence, renderMarkdown } from "../src/index.js";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
const format = readFlag(args, "--format") ?? "json";

if (!file || args.includes("--help")) {
  console.log("Usage: postmaker-skill <evidence.json> [--format json|markdown]");
  process.exit(file ? 0 : 1);
}

const evidence = readEvidence(file);
const pack = makeLaunchPack(evidence);

if (format === "markdown") {
  console.log(renderMarkdown(pack));
} else if (format === "json") {
  console.log(JSON.stringify(pack, null, 2));
} else {
  console.error(`Unsupported format: ${format}`);
  process.exit(1);
}

function readFlag(values, name) {
  const index = values.indexOf(name);
  return index >= 0 ? values[index + 1] : undefined;
}
