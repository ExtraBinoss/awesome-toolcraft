import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  agentWorklogPath,
  createAgentWorklogFixture,
  getAgentWorklogValidationErrors,
  isPassedPlaywrightFallbackPerfRunLine,
  readToolcraftDoc,
} from "./app-acceptance.worklog-test-utils";

const performanceCheckpointError =
  "agent-worklog.md Verification must record `pnpm verify:perf` as the automated Playwright performance checkpoint for first working product delivery.";

describe("starter acceptance worklog contract", () => {
  it("keeps an implementation worklog available for generated app decisions", () => {
    expect(
      existsSync(agentWorklogPath),
      "Generated apps must include docs/toolcraft/agent-worklog.md so implementation decisions and evidence survive the chat context.",
    ).toBe(true);
  });

  it("documents control selection inventory and custom built-in fit checks", () => {
    const coreControlSelection = readToolcraftDoc("core/control-selection.md");
    const componentRules = readToolcraftDoc("component-rules.md");
    const acceptanceTesting = readToolcraftDoc("acceptance-testing.md");

    expect(coreControlSelection).toContain("Control Selection Inventory");
    expect(coreControlSelection).toContain("Product need:");
    expect(coreControlSelection).toContain("Candidate built-ins checked:");
    expect(coreControlSelection).toContain("Best built-in:");
    expect(coreControlSelection).toContain("Rejected alternatives:");
    expect(coreControlSelection).toContain("Target:");
    expect(coreControlSelection).toContain("Custom Control Gate");

    expect(componentRules).toContain("Control Decision Catalog");
    expect(componentRules).toContain("core/control-selection.md");

    expect(acceptanceTesting).toContain("wrong-substitution");
    expect(acceptanceTesting).toContain("built-in fit check");
    expect(acceptanceTesting).toContain("builtInFitCheck");
  });

  it("requires product worklogs to record storyboard evidence for video references", () => {
    const worklog = createAgentWorklogFixture({
      evidenceLines: [
        "- Source reviewed: user prompt, ref.mp4, src/app/product-renderer.tsx.",
        "- Contract applied: Toolcraft workflow.",
      ],
      trailFields: {
        "Reference inputs": "/fixtures/reference-motion/ref.mp4 video reference.",
        "Source/reference checked": "User prompt and /fixtures/reference-motion/ref.mp4 video.",
      },
    });

    expect(getAgentWorklogValidationErrors(worklog)).toContain(
      "agent-worklog.md cites a video reference, screen recording, GIF, extracted frames, or contact sheet; record a Video Reference Study with storyboard frames and frame-to-frame transition analysis.",
    );
  });

  it("accepts product worklogs that record video reference storyboard and transition evidence", () => {
    const worklog = createAgentWorklogFixture({
      evidenceLines: [
        "- Source reviewed: user prompt, ref.mp4, extracted frames, contact sheet, src/app/product-renderer.tsx.",
        "- Contract applied: Toolcraft workflow and video-reference-analysis.",
      ],
      extraDecisionSections: [
        [
          "### Video Reference Study",
          "- Decision: Implement from storyboard frames and frame-to-frame transition analysis.",
          "- Reason: The video reference defines behavior, not only a static visual state.",
          "- Evidence: extracted frames f000/f012/f024/f036 and transition analysis between adjacent frames.",
        ].join("\n"),
      ],
      trailFields: {
        "Alternatives rejected": "Single screenshot implementation because the video behavior changes frame to frame.",
        "Contract rules applied": "video-reference-analysis and acceptance-product-observable.",
        "Reference inputs": "/fixtures/reference-motion/ref.mp4 video reference, extracted frames, contact sheet.",
        "Source/reference checked": "User prompt, /fixtures/reference-motion/ref.mp4 video, extracted frames, and contact sheet.",
      },
    });

    expect(getAgentWorklogValidationErrors(worklog)).toEqual([]);
  });

  it("does not treat ordinary video export worklog evidence as a video reference", () => {
    const worklog = createAgentWorklogFixture({
      decisions: {
        Export: {
          decision: "Expose Export PNG and Export Video.",
          evidence: "src/app/export.ts.",
          reason: "Animated products need still and video output.",
        },
        Renderer: {
          decision: "Use Canvas 2D.",
          evidence: "src/app/product-renderer.tsx.",
          reason: "Product output is simple animated geometry.",
        },
        Timeline: {
          decision: "Use playback.",
          evidence: "src/app/app-schema.ts.",
          reason: "Export Video requires runtime timeline time.",
        },
      },
      evidenceLines: [
        "- Source reviewed: user prompt, app schema, export handler, browser export behavior.",
        "- Contract applied: Toolcraft workflow.",
      ],
      trailFields: {
        Decision: "Use Toolcraft export helpers.",
        "Reference inputs": "None.",
        "Source/reference checked": "User prompt, app schema, export handler, and browser export behavior.",
        "State/output mapping": "Runtime timeline state drives preview and export frames.",
        "User-visible result": "The product renders and exports video.",
      },
    });

    expect(getAgentWorklogValidationErrors(worklog)).toEqual([]);
  });

  it("rejects stale or incomplete product worklogs", () => {
    const errors = getAgentWorklogValidationErrors(
      createAgentWorklogFixture({ mode: "starter" }),
    );

    expect(errors).toContain(
      'agent-worklog.md Status must declare "Mode: product" before final delivery.',
    );
    expect(errors).toContain(
      'agent-worklog.md still declares "Mode: starter"; replace the starter template with product decisions.',
    );
  });

  it("accepts product worklogs with concrete decisions, evidence, verification, and risk state", () => {
    expect(getAgentWorklogValidationErrors(createAgentWorklogFixture())).toEqual([]);
  });

  it("rejects product worklogs that report incomplete required performance gates", () => {
    const worklog = createAgentWorklogFixture({
      risksLines: ["- Risk: Required checks are not complete."],
      trailFields: {
        Risks: "Product contract tests still need updates before final delivery.",
        "Skipped checks": "pnpm verify:final and pnpm verify:perf are not complete yet.",
        Verification: "pnpm test failed; pnpm verify:perf not complete.",
      },
      verificationLines: [
        "- Run: pnpm test failed.",
        "- Run: pnpm verify:perf not complete.",
      ],
    });

    expect(getAgentWorklogValidationErrors(worklog)).toEqual(
      expect.arrayContaining([
        "agent-worklog.md required checks must be passed before final delivery; do not report failed, incomplete, pending, or blocked verification.",
        "agent-worklog.md must not list required checks as skipped unless they are explicitly not required for a post-first-working non-performance edit.",
        performanceCheckpointError,
      ]),
    );
  });

  it("requires first working product worklogs to record a browser performance checkpoint", () => {
    const worklog = createAgentWorklogFixture({
      trailFields: {
        Verification: "pnpm verify:quick; pnpm verify:final.",
      },
      verificationLines: [
        "- Run: pnpm verify:quick",
        "- Run: pnpm verify:final",
      ],
    });

    expect(getAgentWorklogValidationErrors(worklog)).toContain(performanceCheckpointError);
  });

  it("does not accept agent-browser prose as the final machine performance checkpoint", () => {
    const worklog = createAgentWorklogFixture({
      trailFields: {
        Verification: "pnpm verify:quick; agent-browser performance checkpoint.",
      },
      verificationLines: [
        "- Run: pnpm verify:quick",
        "- Browser: performance checkpoint runner agent-browser",
      ],
    });

    expect(getAgentWorklogValidationErrors(worklog)).toContain(
      performanceCheckpointError,
    );
  });

  it("recognizes automated Playwright performance checkpoint evidence line formats", () => {
    expect(
      isPassedPlaywrightFallbackPerfRunLine(
        "- Verification: playwright-fallback browser performance checkpoint",
      ),
    ).toBe(true);
    expect(isPassedPlaywrightFallbackPerfRunLine("- Run: pnpm verify:perf")).toBe(true);
    expect(isPassedPlaywrightFallbackPerfRunLine("- Run: pnpm verify:perf not complete")).toBe(false);
    expect(isPassedPlaywrightFallbackPerfRunLine("- Run: pnpm verify:perf not run")).toBe(false);
  });

  it("accepts the automated Playwright checkpoint without a manual fallback reason", () => {
    const worklog = createAgentWorklogFixture({
      decisions: {
        Performance: {
          decision: "Use the automated Playwright browser performance checkpoint.",
          evidence: "pnpm verify:perf.",
          reason: "The protected runner can issue the machine performance receipt.",
        },
      },
      trailFields: {
        Verification: "pnpm verify:quick; pnpm verify:final; pnpm verify:perf.",
      },
      verificationLines: [
        "- Run: pnpm verify:quick",
        "- Run: pnpm verify:final",
        "- Run: pnpm verify:perf",
      ],
    });

    expect(getAgentWorklogValidationErrors(worklog)).toEqual([]);
  });

  it("allows explicit post-first-working non-performance skips of the full performance suite", () => {
    const skipLine =
      "full performance checkpoint not required for this post-first-working non-performance feature loop.";
    const worklog = createAgentWorklogFixture({
      decisions: {
        Performance: {
          decision: "Skip full perf for this post-first-working copy pass.",
          evidence: "Prior iteration recorded the pnpm verify:perf Playwright checkpoint.",
          reason: "No renderer, workload, viewport, animation, export, or performance-sensitive control changed.",
        },
      },
      trailFields: {
        "Alternatives rejected": "Running full perf because this is a post-first-working non-performance edit.",
        Decision: "Keep renderer, export, and performance matrix unchanged.",
        "Files changed": "src/app/app-schema.ts.",
        Request: "Rename two labels in an already delivered app.",
        Risks: "None; output behavior is unchanged.",
        "Skipped checks": skipLine,
        "State/output mapping": "Label text changes do not alter runtime values or renderer state.",
        "Task type": "Tier 0 copy update after the first working version.",
        "User-visible result": "The labels are clearer and product output is unchanged.",
        Verification: "pnpm verify:quick.",
      },
      trailHeading: "Iteration 2 - Copy refinement",
      verificationLines: [
        "- Run: pnpm verify:quick",
        `- Skipped checks: ${skipLine}`,
      ],
    });

    expect(getAgentWorklogValidationErrors(worklog)).toEqual([]);
  });

  it("rejects product worklogs without an actionable decision trail", () => {
    const worklog = createAgentWorklogFixture({
      omitDecisionTrailFields: [
        "Alternatives rejected",
        "Contract rules applied",
        "Reference inputs",
        "Skipped checks",
        "Source/reference checked",
        "State/output mapping",
        "User-visible result",
      ],
    });

    expect(getAgentWorklogValidationErrors(worklog)).toEqual(
      expect.arrayContaining([
        'agent-worklog.md Decision Trail iteration "Iteration 1 - Product build" must include "User-visible result:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 - Product build" must include "Source/reference checked:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 - Product build" must include "Reference inputs:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 - Product build" must include "Contract rules applied:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 - Product build" must include "Alternatives rejected:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 - Product build" must include "State/output mapping:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 - Product build" must include "Skipped checks:".',
      ]),
    );
  });
});
