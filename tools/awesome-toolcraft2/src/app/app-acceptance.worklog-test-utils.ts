import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const projectDir = join(appDir, "../..");

export const agentWorklogPath = join(projectDir, "docs/toolcraft/agent-worklog.md");

const requiredAgentWorklogDecisionSections = [
  "Renderer",
  "Timeline",
  "Layers",
  "Controls",
  "Export",
  "Performance",
] as const;
const requiredAgentWorklogSections = [
  "Status",
  "Decisions",
  "Decision Trail",
  ...requiredAgentWorklogDecisionSections,
  "Evidence",
  "Verification",
  "Risks",
] as const;
const requiredAgentWorklogDecisionTrailFields = [
  "Request",
  "Task type",
  "User-visible result",
  "Source/reference checked",
  "Reference inputs",
  "Docs/contracts read",
  "Contract rules applied",
  "Decision",
  "Alternatives rejected",
  "State/output mapping",
  "Files changed",
  "Verification",
  "Skipped checks",
  "Risks",
] as const;
type WorklogDecisionSection = (typeof requiredAgentWorklogDecisionSections)[number];
type WorklogDecisionTrailField = (typeof requiredAgentWorklogDecisionTrailFields)[number];
type WorklogDecisionEvidence = {
  decision: string;
  evidence: string;
  reason: string;
};
export type AgentWorklogFixtureOptions = {
  decisions?: Partial<Record<WorklogDecisionSection, Partial<WorklogDecisionEvidence>>>;
  evidenceLines?: readonly string[];
  extraDecisionSections?: readonly string[];
  mode?: "product" | "starter";
  omitDecisionTrailFields?: readonly WorklogDecisionTrailField[];
  risksLines?: readonly string[];
  trailFields?: Partial<Record<WorklogDecisionTrailField, string>>;
  trailHeading?: string;
  verificationLines?: readonly string[];
};
const worklogVideoReferencePattern =
  /\b(?:source\/reference checked|source reviewed|reference inputs):[^\n]*(?:reference\s+(?:video|gif)|screen\s*recording|contact[-\s]*sheet|storyboard|frame[-\s]*by[-\s]*frame|extracted[-\s]*frames?|cleanshot|ffprobe|[^\s]+\.(?:mp4|mov|webm|gif))\b/i;
const worklogVideoReferenceStudyPattern =
  /\b(video reference study|storyboard|frame[-\s]*by[-\s]*frame|transition analysis|frame[-\s]*to[-\s]*frame|contact[-\s]*sheet|extracted frames?)\b/i;
const incompleteRequiredCheckPattern =
  /\b(?:fail(?:ed|s|ing)?|not complete|not completed|incomplete|pending|blocked|planned|todo|to do|to run|will run|not run|not started|not yet|queued)\b/i;
const requiredCheckNamePattern =
  /\b(?:(?:pnpm\s+)?(?:verify:final|verify:perf|test:browser:perf|test:browser|verify:quick|test|build)|browser performance checkpoint|agent-browser|playwright-fallback)\b/i;
const browserPerformanceCheckpointPattern =
  /\b(?:browser performance checkpoint|performance checkpoint|verify:perf|test:browser:perf|playwright-fallback)\b/i;

export function readToolcraftDoc(relativePath: string): string {
  return readFileSync(join(projectDir, "docs/toolcraft", relativePath), "utf8");
}

const defaultDecisionEvidence: Record<WorklogDecisionSection, WorklogDecisionEvidence> = {
  Controls: {
    decision: "Group controls by product entity.",
    evidence: "src/app/app-schema.ts.",
    reason: "Each section maps to visible output behavior.",
  },
  Export: {
    decision: "Provide PNG export.",
    evidence: "panelActions.",
    reason: "The product output is exportable.",
  },
  Layers: {
    decision: "Do not enable layers.",
    evidence: "appSchema.panels.layers is omitted.",
    reason: "The product edits one output.",
  },
  Performance: {
    decision: "Record browser performance coverage.",
    evidence: "pnpm verify:perf automated Playwright checkpoint.",
    reason: "First working product delivery must prove performance.",
  },
  Renderer: {
    decision: "Use SVG renderer.",
    evidence: "src/app/product-renderer.tsx.",
    reason: "The product output is vector-native.",
  },
  Timeline: {
    decision: "Do not enable timeline.",
    evidence: "appSchema.panels.timeline is omitted.",
    reason: "The product is still output.",
  },
};

const defaultDecisionTrailFields: Record<WorklogDecisionTrailField, string> = {
  "Alternatives rejected": "Canvas output because vector output must stay crisp.",
  "Contract rules applied": "runtime-shell-required and output-export-required.",
  Decision: "Use SVG renderer with Toolcraft controls.",
  "Docs/contracts read": "workflow.md, assembly-workflow.md, and performance.md.",
  "Files changed": "src/app/app-schema.ts, src/app/product-renderer.tsx, src/app/app-performance.ts.",
  "Reference inputs": "None.",
  Request: "Build a still vector poster app.",
  Risks: "None; browser and performance gates cover the touched surfaces.",
  "Skipped checks": "None.",
  "Source/reference checked": "User prompt.",
  "State/output mapping": "Schema values feed product-renderer.tsx and export uses runtime state.",
  "Task type": "Schema, renderer, export, acceptance, and performance.",
  "User-visible result": "The canvas renders the poster and exports PNG.",
  Verification: "pnpm verify:quick; pnpm verify:perf.",
};

function renderDecisionSection(
  section: WorklogDecisionSection,
  overrides: Partial<WorklogDecisionEvidence> | undefined,
): string {
  const decision = {
    ...defaultDecisionEvidence[section],
    ...overrides,
  };

  return [
    `### ${section}`,
    `- Decision: ${decision.decision}`,
    `- Reason: ${decision.reason}`,
    `- Evidence: ${decision.evidence}`,
  ].join("\n");
}

export function createAgentWorklogFixture({
  decisions = {},
  evidenceLines = [
    "- Source reviewed: src/app/app-schema.ts and src/app/product-renderer.tsx.",
    "- Contract applied: runtime-shell-required and performance-coverage-levels.",
  ],
  extraDecisionSections = [],
  mode = "product",
  omitDecisionTrailFields = [],
  risksLines = ["- None: no known risk."],
  trailFields = {},
  trailHeading = "Iteration 1 - Product build",
  verificationLines = [
    "- Run: pnpm verify:quick",
    "- Run: pnpm verify:perf",
  ],
}: AgentWorklogFixtureOptions = {}): string {
  const omittedFields = new Set<WorklogDecisionTrailField>(omitDecisionTrailFields);
  const resolvedTrailFields = {
    ...defaultDecisionTrailFields,
    ...trailFields,
  };
  const decisionTrailLines = requiredAgentWorklogDecisionTrailFields
    .filter((field) => !omittedFields.has(field))
    .map((field) => `- ${field}: ${resolvedTrailFields[field]}`);

  return [
    "# Implementation Worklog",
    "",
    "## Status",
    "",
    `Mode: ${mode}`,
    "",
    "## Decisions",
    "",
    ...requiredAgentWorklogDecisionSections.map((section) =>
      renderDecisionSection(section, decisions[section]),
    ),
    ...extraDecisionSections,
    "",
    "## Decision Trail",
    "",
    `### ${trailHeading}`,
    "",
    ...decisionTrailLines,
    "",
    "## Evidence",
    "",
    ...evidenceLines,
    "",
    "## Verification",
    "",
    ...verificationLines,
    "",
    "## Risks",
    "",
    ...risksLines,
  ].join("\n");
}

function getMarkdownHeadingLevel(line: string): number | null {
  const match = /^(#{1,6})\s+\S/.exec(line.trim());

  return match ? match[1].length : null;
}

function getMarkdownSectionBody(source: string, heading: string): string {
  const lines = source.split(/\r?\n/);
  const headingPattern = new RegExp(`^(#{1,6})\\s+${escapeRegExp(heading)}\\s*$`, "i");
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));

  if (startIndex < 0) {
    return "";
  }

  const startLevel = getMarkdownHeadingLevel(lines[startIndex]);
  const bodyLines: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const nextLevel = getMarkdownHeadingLevel(lines[index]);

    if (startLevel !== null && nextLevel !== null && nextLevel <= startLevel) {
      break;
    }

    bodyLines.push(lines[index]);
  }

  return bodyLines.join("\n").trim();
}

function getAgentWorklogDecisionTrailIterations(
  decisionTrailBody: string,
): Array<{ body: string; heading: string }> {
  const iterations: Array<{ body: string; heading: string }> = [];
  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of decisionTrailBody.split(/\r?\n/)) {
    const headingMatch = /^###\s+(.+?)\s*$/.exec(line.trim());

    if (headingMatch) {
      if (currentHeading) {
        iterations.push({ body: currentBody.join("\n").trim(), heading: currentHeading });
      }

      currentHeading = headingMatch[1];
      currentBody = [];
      continue;
    }

    if (currentHeading) {
      currentBody.push(line);
    }
  }

  if (currentHeading) {
    iterations.push({ body: currentBody.join("\n").trim(), heading: currentHeading });
  }

  return iterations;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getWorklogLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function isAllowedPerfSkipLine(line: string): boolean {
  return (
    browserPerformanceCheckpointPattern.test(line) &&
    /\bnot required\b/i.test(line) &&
    /\b(?:post-first|after first|not first|feature loop|non-performance)\b/i.test(line)
  );
}

function isIncompleteOrSkippedLine(line: string): boolean {
  return (
    /\b(?:skip|skipped|not required)\b/i.test(line) ||
    incompleteRequiredCheckPattern.test(line)
  );
}

function isVerificationEvidenceLine(line: string): boolean {
  return /\b(?:Run|Verification|Browser):/i.test(line);
}

export function isPassedPlaywrightFallbackPerfRunLine(line: string): boolean {
  return (
    isVerificationEvidenceLine(line) &&
    (/\bpnpm\s+verify:perf\b/i.test(line) ||
      (/\bplaywright-fallback\b/i.test(line) &&
        /\b(?:performance|perf|checkpoint)\b/i.test(line))) &&
    !isIncompleteOrSkippedLine(line)
  );
}

function getAgentWorklogVerificationGateErrors(source: string): string[] {
  const lines = getWorklogLines(source);
  const errors: string[] = [];
  const hasPassedPlaywrightFallbackPerfRun = lines.some(
    isPassedPlaywrightFallbackPerfRunLine,
  );
  const hasPassedPerfRun = hasPassedPlaywrightFallbackPerfRun;
  const hasAllowedPerfSkip = lines.some(isAllowedPerfSkipLine);
  const failedRequiredCheckLine = lines.find(
    (line) => requiredCheckNamePattern.test(line) && incompleteRequiredCheckPattern.test(line),
  );
  const skippedRequiredCheckLine = lines.find(
    (line) =>
      /^-?\s*(?:Skipped checks|Skip):/i.test(line) &&
      requiredCheckNamePattern.test(line) &&
      !/\bnone\b/i.test(line) &&
      !isAllowedPerfSkipLine(line),
  );

  if (failedRequiredCheckLine) {
    errors.push(
      "agent-worklog.md required checks must be passed before final delivery; do not report failed, incomplete, pending, or blocked verification.",
    );
  }

  if (skippedRequiredCheckLine) {
    errors.push(
      "agent-worklog.md must not list required checks as skipped unless they are explicitly not required for a post-first-working non-performance edit.",
    );
  }

  if (!hasPassedPerfRun && !hasAllowedPerfSkip) {
    errors.push(
      "agent-worklog.md Verification must record `pnpm verify:perf` as the automated Playwright performance checkpoint for first working product delivery.",
    );
  }

  return errors;
}

export function getAgentWorklogValidationErrors(source: string): string[] {
  const errors: string[] = [];

  for (const section of requiredAgentWorklogSections) {
    if (!getMarkdownSectionBody(source, section)) {
      errors.push(`agent-worklog.md must include a populated "${section}" section.`);
    }
  }

  const statusBody = getMarkdownSectionBody(source, "Status");

  if (!/\bMode:\s*product\b/i.test(statusBody)) {
    errors.push('agent-worklog.md Status must declare "Mode: product" before final delivery.');
  }

  if (/\bMode:\s*starter\b/i.test(statusBody)) {
    errors.push('agent-worklog.md still declares "Mode: starter"; replace the starter template with product decisions.');
  }

  for (const section of requiredAgentWorklogDecisionSections) {
    const body = getMarkdownSectionBody(source, section);

    if (!/\bDecision:\s*\S/i.test(body)) {
      errors.push(`agent-worklog.md "${section}" must include a concrete Decision.`);
    }

    if (!/\bReason:\s*\S/i.test(body)) {
      errors.push(`agent-worklog.md "${section}" must include the Reason for the decision.`);
    }

    if (!/\bEvidence:\s*\S/i.test(body)) {
      errors.push(`agent-worklog.md "${section}" must include Evidence such as files, tests, browser checks, or contract rules.`);
    }
  }

  const decisionTrailBody = getMarkdownSectionBody(source, "Decision Trail");
  const decisionTrailIterations = getAgentWorklogDecisionTrailIterations(decisionTrailBody);

  if (decisionTrailIterations.length === 0) {
    errors.push("agent-worklog.md Decision Trail must include at least one iteration heading.");
  }

  for (const iteration of decisionTrailIterations) {
    for (const field of requiredAgentWorklogDecisionTrailFields) {
      const fieldPattern = new RegExp(`\\b${escapeRegExp(field)}:\\s*\\S`, "i");

      if (!fieldPattern.test(iteration.body)) {
        errors.push(
          `agent-worklog.md Decision Trail iteration "${iteration.heading}" must include "${field}:".`,
        );
      }
    }
  }

  const evidenceBody = getMarkdownSectionBody(source, "Evidence");
  const verificationBody = getMarkdownSectionBody(source, "Verification");
  const risksBody = getMarkdownSectionBody(source, "Risks");

  if (!/\b(Source reviewed|Contract applied|Evidence):\s*\S/i.test(evidenceBody)) {
    errors.push("agent-worklog.md Evidence must name reviewed files, references, or contract rules.");
  }

  if (
    worklogVideoReferencePattern.test(source) &&
    !worklogVideoReferenceStudyPattern.test(source)
  ) {
    errors.push(
      "agent-worklog.md cites a video reference, screen recording, GIF, extracted frames, or contact sheet; record a Video Reference Study with storyboard frames and frame-to-frame transition analysis.",
    );
  }

  if (!/\bpnpm\s+(verify|test|build|typecheck)|browser|Playwright|perf/i.test(verificationBody)) {
    errors.push("agent-worklog.md Verification must list concrete test/build/browser/performance checks.");
  }

  errors.push(...getAgentWorklogVerificationGateErrors(source));

  if (!/\b(Risk|None):\s*\S/i.test(risksBody)) {
    errors.push('agent-worklog.md Risks must include either "Risk:" entries or "None:" with a reason.');
  }

  return errors;
}
