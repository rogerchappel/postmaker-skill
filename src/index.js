import fs from "node:fs";

const REQUIRED_FIELDS = ["project", "audience", "changes", "verification"];

export function readEvidence(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return normalizeEvidence(JSON.parse(raw));
}

export function normalizeEvidence(input) {
  const evidence = {
    project: input.project ?? "",
    audience: input.audience ?? "",
    changes: Array.isArray(input.changes) ? input.changes : [],
    verification: Array.isArray(input.verification)
      ? input.verification.map((check, index) => normalizeVerification(check, index))
      : [],
    limitations: Array.isArray(input.limitations) ? input.limitations : [],
    sources: Array.isArray(input.sources) ? input.sources : [],
    requestedClaims: Array.isArray(input.requestedClaims) ? input.requestedClaims : []
  };

  return {
    ...evidence,
    warnings: validateEvidence(evidence)
  };
}

export function validateEvidence(evidence) {
  const warnings = [];
  const verification = Array.isArray(evidence.verification)
    ? evidence.verification.map((check, index) =>
      check?.status ? check : normalizeVerification(check, index))
    : [];

  for (const field of REQUIRED_FIELDS) {
    if (field === "changes" || field === "verification") {
      if (!Array.isArray(evidence[field]) || evidence[field].length === 0) {
        warnings.push(`Missing required evidence: ${field}`);
      }
    } else if (!evidence[field]) {
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

  for (const claim of evidence.requestedClaims) {
    const supported = evidence.changes.some((change) => textIncludes(change, claim)) ||
      verification.some((check) => check.status === "passed" && textIncludes(check.command, claim)) ||
      evidence.sources.some((source) => textIncludes(source.summary ?? source.path ?? source, claim));
    if (!supported) {
      warnings.push(`Unsupported requested claim: ${claim}`);
    }
  }

  return warnings;
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
