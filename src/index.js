import fs from "node:fs";

const REQUIRED_FIELDS = ["project", "audience", "changes", "verification"];

export function readEvidence(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return normalizeEvidence(JSON.parse(raw));
}

export function normalizeEvidence(input) {
  const evidence = {
    project: input.project ?? "",
    audience: input.audience ?? "agent builders",
    changes: Array.isArray(input.changes) ? input.changes : [],
    verification: Array.isArray(input.verification) ? input.verification : [],
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
  for (const field of REQUIRED_FIELDS) {
    if (field === "changes" || field === "verification") {
      if (!Array.isArray(evidence[field]) || evidence[field].length === 0) {
        warnings.push(`Missing required evidence: ${field}`);
      }
    } else if (!evidence[field]) {
      warnings.push(`Missing required evidence: ${field}`);
    }
  }

  for (const claim of evidence.requestedClaims) {
    const supported = evidence.changes.some((change) => textIncludes(change, claim)) ||
      evidence.verification.some((check) => textIncludes(check.command ?? check, claim)) ||
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
  const checks = evidence.verification.map((item) => formatCheck(item));
  const limitations = evidence.limitations.length > 0 ? evidence.limitations : ["No limitations supplied."];
  const sources = evidence.sources.map((source) => formatSource(source));

  return {
    project: evidence.project,
    audience: evidence.audience,
    posts: {
      launch: `${evidence.project} is ready for ${evidence.audience}: ${sentenceList(keyChanges)}. Verified with ${checks.join(", ")}.`,
      technical: `Built ${evidence.project} around evidence-first release notes. Core changes: ${bulletInline(keyChanges)}. Verification: ${checks.join("; ")}.`,
      demoCaption: `Demo ${evidence.project}: ${keyChanges[0] ?? "review the shipped workflow"} -> ${checks[0] ?? "run the smoke check"}.`
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

function formatCheck(item) {
  if (typeof item === "string") return item;
  const result = item.result ? ` (${item.result})` : "";
  return `${item.command}${result}`;
}

function formatSource(source) {
  if (typeof source === "string") return source;
  return source.summary ? `${source.path}: ${source.summary}` : source.path;
}
