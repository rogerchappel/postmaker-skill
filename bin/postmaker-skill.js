#!/usr/bin/env node
import {
  EvidenceValidationError,
  makeLaunchPack,
  readEvidence,
  renderMarkdown
} from "../src/index.js";

const args = process.argv.slice(2);
const usage = "Usage: postmaker-skill <evidence.json> [--format json|markdown]";

if (args.includes("--help")) {
  console.log(usage);
  process.exit(0);
}

const { file, format } = parseArgs(args);
let pack;
try {
  pack = makeLaunchPack(readEvidence(file));
} catch (error) {
  if (error instanceof EvidenceValidationError) fail(error.message);
  throw error;
}

if (format === "markdown") {
  console.log(renderMarkdown(pack));
} else if (format === "json") {
  console.log(JSON.stringify(pack, null, 2));
} else {
  fail(`Unsupported format: ${format}`);
}

const missingRequired = pack.warnings
  .filter((warning) => warning.startsWith("Missing required evidence:"))
  .map((warning) => warning.slice("Missing required evidence:".length).trim());

if (missingRequired.length > 0) {
  console.error(
    `Required evidence is not publishable; supply: ${missingRequired.join(", ")}.`
  );
  process.exit(1);
}

if (pack.warnings.some((warning) =>
  warning.startsWith("Failed verification:") ||
  warning.startsWith("Malformed verification record"))) {
  console.error("Verification evidence is not publishable; review the warnings above.");
  process.exit(1);
}

function parseArgs(values) {
  let file;
  let format = "json";

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--format") {
      const next = values[index + 1];
      if (!next || next.startsWith("--")) {
        fail("Missing value for --format");
      }
      format = next;
      index += 1;
    } else if (value.startsWith("--")) {
      fail(`Unknown option: ${value}`);
    } else if (file) {
      fail(`Unexpected argument: ${value}`);
    } else {
      file = value;
    }
  }

  if (!file) {
    fail(usage);
  }
  if (!["json", "markdown"].includes(format)) {
    fail(`Unsupported format: ${format}`);
  }

  return { file, format };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
