import fs from "node:fs";

const REQUIRED_FIELDS = ["project", "audience", "changes", "verification"];

export class EvidenceValidationError extends Error {
  constructor(diagnostics) {
    super(`Invalid evidence: ${diagnostics.join("; ")}`);
    this.name = "EvidenceValidationError";
    this.diagnostics = diagnostics;
  }
}

export function readEvidence(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return normalizeEvidence(JSON.parse(raw));
}

export function normalizeEvidence(input) {
  assertEvidenceShape(input);
  const evidence = {
    project: input.project.trim(),
    audience: input.audience.trim(),
    changes: input.changes.map((change) => change.trim()),
    verification: input.verification.map((check, index) => normalizeVerification(check, index)),
    limitations: (input.limitations ?? []).map((limitation) => limitation.trim()),
    sources: input.sources ?? [],
    requestedClaims: (input.requestedClaims ?? []).map((claim) => claim.trim())
  };

  return {
    ...evidence,
    warnings: validateEvidence(evidence)
  };
}

function assertEvidenceShape(input) {
  const diagnostics = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new EvidenceValidationError(["root must be a JSON object"]);
  }

  requireNonEmptyString(input, "project", diagnostics);
  requireNonEmptyString(input, "audience", diagnostics);
  requireStringArray(input, "changes", diagnostics, { required: true });
  requireArray(input, "verification", diagnostics, { required: true });
  requireStringArray(input, "limitations", diagnostics);
  requireStringArray(input, "requestedClaims", diagnostics);
  requireSources(input.sources, diagnostics);

  if (diagnostics.length > 0) throw new EvidenceValidationError(diagnostics);
}

function requireNonEmptyString(input, field, diagnostics) {
  if (typeof input[field] !== "string" || !input[field].trim()) {
    diagnostics.push(`${field} must be a non-empty string`);
  }
}

function requireArray(input, field, diagnostics, { required = false } = {}) {
  const value = input[field];
  if (value === undefined && !required) return false;
  if (!Array.isArray(value)) {
    diagnostics.push(`${field} must be an array`);
    return false;
  }
  if (required && value.length === 0) diagnostics.push(`${field} must not be empty`);
  return true;
}

function requireStringArray(input, field, diagnostics, options) {
  if (!requireArray(input, field, diagnostics, options)) return;
  input[field].forEach((value, index) => {
    if (typeof value !== "string" || !value.trim()) {
      diagnostics.push(`${field}[${index}] must be a non-empty string`);
    }
  });
}

function requireSources(sources, diagnostics) {
  if (sources === undefined) return;
  if (!Array.isArray(sources)) {
    diagnostics.push("sources must be an array");
    return;
  }
  sources.forEach((source, index) => {
    if (typeof source === "string") {
      if (!source.trim()) diagnostics.push(`sources[${index}] must be a non-empty string or source object`);
      return;
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      diagnostics.push(`sources[${index}] must be a non-empty string or source object`);
      return;
    }
    if (typeof source.path !== "string" || !source.path.trim()) {
      diagnostics.push(`sources[${index}].path must be a non-empty string`);
    }
    if (source.summary !== undefined &&
      (typeof source.summary !== "string" || !source.summary.trim())) {
      diagnostics.push(`sources[${index}].summary must be a non-empty string when provided`);
    }
  });
}

export function validateEvidence(evidence) {
  const warnings = [];
  const input = evidence && typeof evidence === "object" && !Array.isArray(evidence)
    ? evidence
    : {};
  const changes = collectionOrEmpty(input, "changes", warnings, { required: true });
  const rawVerification = collectionOrEmpty(input, "verification", warnings, { required: true });
  const sources = collectionOrEmpty(input, "sources", warnings);
  const requestedClaims = collectionOrEmpty(input, "requestedClaims", warnings);
  const verification = rawVerification.map((check, index) =>
    check?.status ? check : normalizeVerification(check, index));

  for (const field of REQUIRED_FIELDS) {
    if (field === "changes" || field === "verification") {
      if (Array.isArray(input[field]) && input[field].length === 0) {
        warnings.push(`Missing required evidence: ${field}`);
      }
    } else if (!input[field]) {
      warnings.push(`Missing required evidence: ${field}`);
    }
  }

  for (const check of verification) {
    if (check.status === "failed") {
      warnings.push(`Failed verification: ${formatCheck(check)}`);
    } else if (check.status === "malformed") {
      warnings.push(`Malformed verification record at index ${check.index}: command and result are required`);
    }
  }

  for (const claim of requestedClaims) {
    const supported = changes.some((change) => textIncludes(change, claim)) ||
      verification.some((check) => check.status === "passed" && textIncludes(check.command, claim)) ||
      sources.some((source) => textIncludes(source?.summary ?? source?.path ?? source, claim));
    if (!supported) {
      warnings.push(`Unsupported requested claim: ${claim}`);
    }
  }

  return warnings;
}

function collectionOrEmpty(input, field, warnings, { required = false } = {}) {
  if (Array.isArray(input[field])) return input[field];
  if (input[field] !== undefined) {
    warnings.push(`Malformed evidence: ${field} must be an array`);
  } else if (required) {
    warnings.push(`Missing required evidence: ${field}`);
  }
  return [];
}

export function makeLaunchPack(input) {
  const evidence = normalizeEvidence(input);
  const keyChanges = evidence.changes.slice(0, 3);
  const checks = evidence.verification
    .filter((item) => item.status === "passed")
    .map((item) => formatCheck(item));
  const verificationSummary = checks.length > 0
    ? `Verified with ${checks.join(", ")}.`
    : "Verification requires review; no passing checks were supplied.";
  const limitations = evidence.limitations.length > 0 ? evidence.limitations : ["No limitations supplied."];
  const sources = evidence.sources.map((source) => formatSource(source));

  return {
    project: evidence.project,
    audience: evidence.audience,
    posts: {
      launch: `${evidence.project} is ready for ${evidence.audience}: ${sentenceList(keyChanges)}. ${verificationSummary}`,
      technical: `Built ${evidence.project} around evidence-first release notes. Core changes: ${bulletInline(keyChanges)}. ${verificationSummary}`,
      demoCaption: `Demo ${evidence.project}: ${keyChanges[0] ?? "review the shipped workflow"} -> ${checks[0] ?? "verification requires review"}.`
    },
    checklist: [
      "Confirm every public claim appears in the supplied evidence.",
      "Run the listed verification commands again before publishing.",
      "Keep limitations near the draft when sharing externally.",
      "Ask for approval before posting to any external account."
    ],
    limitations,
    sources,
    warnings: evidence.warnings
  };
}

export function renderMarkdown(pack) {
  const warningLines = pack.warnings.length > 0 ? pack.warnings.map((item) => `- ${item}`) : ["- None"];
  return [
    `# ${pack.project} Launch Pack`,
    "",
    `Audience: ${pack.audience}`,
    "",
    "## Launch Post",
    pack.posts.launch,
    "",
    "## Technical Post",
    pack.posts.technical,
    "",
    "## Demo Caption",
    pack.posts.demoCaption,
    "",
    "## Follow-up Checklist",
    ...pack.checklist.map((item) => `- ${item}`),
    "",
    "## Limitations",
    ...pack.limitations.map((item) => `- ${item}`),
    "",
    "## Sources",
    ...(pack.sources.length > 0 ? pack.sources.map((item) => `- ${item}`) : ["- No sources supplied."]),
    "",
    "## Warnings",
    ...warningLines,
    ""
  ].join("\n");
}

function textIncludes(value, fragment) {
  return String(value).toLowerCase().includes(String(fragment).toLowerCase());
}

function sentenceList(items) {
  if (items.length === 0) return "the supplied release evidence";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function bulletInline(items) {
  return items.length > 0 ? items.join(" | ") : "No changes supplied";
}

function normalizeVerification(item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return { command: "", result: "", status: "malformed", index };
  }

  const command = typeof item.command === "string" ? item.command.trim() : "";
  const result = typeof item.result === "string" ? item.result.trim() : "";
  if (!command || !result) {
    return { command, result, status: "malformed", index };
  }

  const normalizedResult = result.toLowerCase();
  const passed = ["pass", "passed", "success", "succeeded", "ok"].includes(normalizedResult);
  return {
    command,
    result,
    status: passed ? "passed" : "failed",
    index
  };
}

function formatCheck(item) {
  const result = item.result ? ` (${item.result})` : "";
  return `${item.command}${result}`;
}

function formatSource(source) {
  if (typeof source === "string") return source;
  return source.summary ? `${source.path}: ${source.summary}` : source.path;
}
