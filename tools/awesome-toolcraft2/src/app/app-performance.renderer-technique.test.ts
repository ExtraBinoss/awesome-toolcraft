import { describe, expect, it } from "vitest";
import { validateToolcraftPerformanceCoverage } from "@/toolcraft/runtime";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import {
  projectDocsIncludeFixedBackgroundDecision,
  schemaHasOutputBackgroundColorControl,
  sourceUsesCustomRenderer,
  sourceUsesHardcodedOutputBackgroundColor,
} from "./app-performance-test-utils";

describe("Toolcraft starter renderer technique performance contract", () => {
  it("requires generated custom renderers to opt into the performance matrix", () => {
    if (sourceUsesCustomRenderer()) {
      expect(appPerformance.usesCustomRenderer).toBe(true);
    }
  });

  it("requires custom renderer apps to mirror the renderer decision in typed performance config", () => {
    if (!appPerformance.usesCustomRenderer) {
      return;
    }

    expect(
      appPerformance.rendererTechnique,
      "Custom renderer apps must declare rendererTechnique in app-performance.ts; prose specs and plans are not enough.",
    ).toBeDefined();
  });

  it("requires custom renderer apps to mirror the render pipeline in typed performance config", () => {
    if (!appPerformance.usesCustomRenderer) {
      return;
    }

    expect(
      appPerformance.rendererPipeline,
      "Custom renderer apps must declare rendererPipeline in app-performance.ts; prose specs and plans are not enough.",
    ).toBeDefined();
  });

  it("requires custom renderer apps to mirror layer inventory in typed performance config", () => {
    if (!appPerformance.usesCustomRenderer) {
      return;
    }

    expect(
      appPerformance.rendererTechnique?.layers?.length ?? 0,
      "Custom renderer apps must mirror the Renderer Layer Inventory in app-performance.ts rendererTechnique.layers so browser tests and zoom-stress classification can verify the real visual layers.",
    ).toBeGreaterThan(0);
  });

  it("requires renderer-owned hardcoded backgrounds to be schema-controlled or explicitly fixed", () => {
    if (!sourceUsesHardcodedOutputBackgroundColor()) {
      return;
    }

    expect(
      schemaHasOutputBackgroundColorControl() || projectDocsIncludeFixedBackgroundDecision(),
      "Renderer-owned output background colors must be schema color controls. If a background is intentionally fixed, document the fixed background reason in the app spec/plan so the missing control is deliberate.",
    ).toBe(true);
  });

  it("requires custom renderers to declare a renderer strategy", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "none",
        rendererWorkload: "simple-composition",
        scenarios: appPerformance.scenarios,
        usesCustomRenderer: true,
        workloadTargets: appPerformance.workloadTargets,
      }),
    ).toEqual(
      expect.arrayContaining([
        'Custom renderers must declare rendererStrategy "dom", "svg", "canvas-2d", "webgl", or "webgpu".',
      ]),
    );
  });

  it("rejects renderer strategies on non-custom apps", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "canvas-2d",
        rendererWorkload: "none",
        scenarios: appPerformance.scenarios,
        usesCustomRenderer: false,
        workloadTargets: appPerformance.workloadTargets,
      }),
    ).toEqual(
      expect.arrayContaining([
        'Non-custom renderer configs must use rendererStrategy "none", received "canvas-2d".',
      ]),
    );
  });

  it("requires custom renderers to declare a non-empty renderer workload", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "canvas-2d",
        rendererWorkload: "none",
        scenarios: appPerformance.scenarios,
        usesCustomRenderer: true,
        workloadTargets: appPerformance.workloadTargets,
      }),
    ).toEqual(
      expect.arrayContaining([
        'Custom renderers must declare rendererWorkload "simple-composition", "text-output", "vector-output", or "pixel-output".',
      ]),
    );
  });

  it("rejects renderer workloads on non-custom apps", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "none",
        rendererWorkload: "simple-composition",
        scenarios: appPerformance.scenarios,
        usesCustomRenderer: false,
        workloadTargets: appPerformance.workloadTargets,
      }),
    ).toEqual(
      expect.arrayContaining([
        'Non-custom renderer configs must use rendererWorkload "none", received "simple-composition".',
      ]),
    );
  });

  it("requires pixel-output renderers to use GPU or measured CPU evidence", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "canvas-2d",
        rendererWorkload: "pixel-output",
        scenarios: appPerformance.scenarios,
        usesCustomRenderer: true,
        workloadTargets: appPerformance.workloadTargets,
      }),
    ).toEqual(
      expect.arrayContaining([
        'rendererWorkload "pixel-output" should use rendererStrategy "webgl" or "webgpu", received "canvas-2d". Keeping a CPU renderer requires rendererTechnique.measuredAlternativeEvidence for WebGL/WebGPU stress comparison.',
      ]),
    );
  });

  it("rejects text and vector product techniques that silently choose pixel output", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "webgl",
        rendererTechnique: {
          exportRenderer: "webgl",
          fidelityRisks: ["raster output could blur product geometry"],
          performanceRisks: ["large output requires GPU-backed drawing"],
          previewRenderer: "webgl",
          productRepresentation: "vector",
          rendererStrategy: "webgl",
          rendererWorkload: "pixel-output",
          sourceRepresentation: "svg",
          whyNotAlternativeStrategies: ["svg preview was not selected"],
        },
        rendererWorkload: "pixel-output",
        scenarios: appPerformance.scenarios,
        usesCustomRenderer: true,
        workloadTargets: appPerformance.workloadTargets,
      }),
    ).toEqual(
      expect.arrayContaining([
        'productRepresentation "vector" requires rendererWorkload "vector-output" unless intentionalRasterizationReason is provided.',
      ]),
    );
  });

  it("requires pixel-output renderers to include a stress preview or animation scenario", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "webgl",
        rendererWorkload: "pixel-output",
        scenarios: [
          {
            automated: true,
            automatedTestName: "perf: preview render stays under budget",
            browser: true,
            browserTestName: "browser perf: preview render stays under budget",
            budget: { maxLongTaskMs: 120, maxPreviewMs: 1000 },
            expectedObservable: "Preview renders without freezing.",
            fixture: "1600x1000 output fixture",
            id: "preview-render",
            interaction: "preview-render",
            workload: false,
          },
          {
            automated: true,
            automatedTestName: "perf: prompt changes stay responsive",
            browser: true,
            browserTestName: "browser perf: prompt changes stay responsive",
            budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
            controlLabel: "Prompt",
            expectedObservable: "Prompt changes without blocking preview.",
            fixture: "starter prompt fixture",
            id: "generation-prompt-change",
            interaction: "control-change",
            target: "generation.prompt",
            values: {
              default: "Describe the effect",
              max: "Performance verified prompt with a longer generation request",
              min: "",
            },
            workload: true,
          },
          {
            automated: true,
            automatedTestName: "perf: viewport stays stable",
            browser: true,
            browserTestName: "browser perf: viewport stays stable",
            budget: { maxFrameGapMs: 80 },
            expectedObservable: "Viewport remains stable.",
            fixture: "1600x1000 output fixture",
            id: "viewport-stability",
            interaction: "viewport-stability",
            workload: false,
          },
        ],
        usesCustomRenderer: true,
        workloadTargets: ["generation.prompt"],
      }),
    ).toEqual(
      expect.arrayContaining([
        'rendererWorkload "pixel-output" must include a stress preview-render or animation-frame scenario with stress: true for the largest product canvas and heaviest workload values.',
      ]),
    );
  });

  it("requires pixel-output renderers to budget long tasks", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "webgl",
        rendererWorkload: "pixel-output",
        scenarios: [
          {
            automated: true,
            automatedTestName: "perf: preview render stays under budget",
            browser: true,
            browserTestName: "browser perf: preview render stays under budget",
            budget: { maxPreviewMs: 1000 },
            expectedObservable: "Worst-case preview renders without freezing.",
            fixture: "2400x1600 worst-case output fixture",
            id: "preview-render",
            interaction: "preview-render",
            stress: true,
            workload: false,
          },
          {
            automated: true,
            automatedTestName: "perf: prompt changes stay responsive",
            browser: true,
            browserTestName: "browser perf: prompt changes stay responsive",
            budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
            controlLabel: "Prompt",
            expectedObservable: "Prompt changes without blocking preview.",
            fixture: "starter prompt fixture",
            id: "generation-prompt-change",
            interaction: "control-change",
            target: "generation.prompt",
            values: {
              default: "Describe the effect",
              max: "Performance verified prompt with a longer generation request",
              min: "",
            },
            workload: true,
          },
          {
            automated: true,
            automatedTestName: "perf: viewport stays stable",
            browser: true,
            browserTestName: "browser perf: viewport stays stable",
            budget: { maxFrameGapMs: 80 },
            expectedObservable: "Viewport remains stable.",
            fixture: "1600x1000 output fixture",
            id: "viewport-stability",
            interaction: "viewport-stability",
            workload: false,
          },
        ],
        usesCustomRenderer: true,
        workloadTargets: ["generation.prompt"],
      }),
    ).toEqual(
      expect.arrayContaining([
        'rendererWorkload "pixel-output" must include at least one maxLongTaskMs budget so GPU-backed previews cannot pass while freezing the main thread.',
      ]),
    );
  });
});
