import { describe, expect, it } from "vitest";
import { defineToolcraft, validateToolcraftPerformanceCoverage } from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";

describe("Toolcraft starter performance budgets and control coverage", () => {
  it("requires every visible non-action control to have performance coverage", () => {
    const rendererSchema = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 1080, unit: "px", width: 1440 },
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                depth: {
                  defaultValue: 50,
                  label: "Depth",
                  max: 100,
                  min: 0,
                  target: "shader.depth",
                  type: "slider",
                },
                gradient: {
                  defaultValue: "aurora",
                  label: "Gradient",
                  options: [
                    { label: "Aurora", value: "aurora" },
                    { label: "Prism", value: "prism" },
                  ],
                  target: "shader.gradient",
                  type: "select",
                },
                mode: {
                  defaultValue: "soft",
                  label: "Mode",
                  options: [
                    { label: "Soft", value: "soft" },
                    { label: "Sharp", value: "sharp" },
                  ],
                  target: "shader.mode",
                  type: "segmented",
                },
              },
              title: "Shader",
            },
          ],
          title: "Shader Controls",
        },
      },
    });

    expect(
      validateToolcraftPerformanceCoverage(rendererSchema, {
        rendererStrategy: "canvas-2d",
        rendererWorkload: "simple-composition",
        scenarios: [
          {
            automated: true,
            automatedTestName: "perf: preview render stays under budget",
            browser: true,
            browserTestName: "browser perf: preview render stays under budget",
            budget: { maxPreviewMs: 1000 },
            expectedObservable: "Preview renders without freezing.",
            fixture: "1440x1080 shader fixture",
            id: "preview-render",
            interaction: "preview-render",
            workload: false,
          },
          {
            automated: true,
            automatedTestName: "perf: depth drag stays responsive",
            browser: true,
            browserTestName: "browser perf: depth drag stays responsive",
            budget: { maxFrameGapMs: 50, maxInteractionMs: 250 },
            controlLabel: "Depth",
            expectedObservable: "Dragging Depth remains responsive.",
            fixture: "1440x1080 shader fixture",
            id: "depth-drag",
            interaction: "control-drag",
            target: "shader.depth",
            values: { default: 50, max: 100, min: 0 },
            workload: true,
          },
          {
            automated: true,
            automatedTestName: "perf: viewport stays stable",
            browser: true,
            browserTestName: "browser perf: viewport stays stable",
            budget: { maxFrameGapMs: 50 },
            expectedObservable: "Canvas zoom and offset do not jump.",
            fixture: "1440x1080 shader fixture",
            id: "viewport-stability",
            interaction: "viewport-stability",
            workload: false,
          },
        ],
        usesCustomRenderer: true,
        workloadTargets: ["shader.depth"],
      }),
    ).toEqual(
      expect.arrayContaining([
        "shader.gradient must have a performance scenario because every visible control can affect app responsiveness.",
        "shader.mode must have a performance scenario because every visible control can affect app responsiveness.",
      ]),
    );
  });

  it("requires visible control performance coverage even without a custom renderer", () => {
    const controlsSchema = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "intrinsic-media" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                mode: {
                  defaultValue: "soft",
                  label: "Mode",
                  options: [
                    { label: "Soft", value: "soft" },
                    { label: "Sharp", value: "sharp" },
                  ],
                  target: "app.mode",
                  type: "select",
                },
              },
              title: "Display",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftPerformanceCoverage(controlsSchema, {
        rendererStrategy: "none",
        rendererWorkload: "none",
        scenarios: [],
        usesCustomRenderer: false,
        workloadTargets: [],
      }),
    ).toEqual(
      expect.arrayContaining([
        "app.mode must have a performance scenario because every visible control can affect app responsiveness.",
      ]),
    );
  });

  it("requires budgets that match each performance interaction type", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "none",
        rendererWorkload: "none",
        scenarios: [
          {
            automated: true,
            automatedTestName: "perf: char size drag stays responsive",
            browser: true,
            browserTestName: "browser perf: char size drag stays responsive",
            budget: { maxExportMs: 100 },
            expectedObservable: "Dragging Char Size remains responsive.",
            fixture: "1600x1000 transparent glyph fixture",
            id: "char-size-drag",
            interaction: "control-drag",
            target: "generation.prompt",
            values: { default: 12, max: 32, min: 4 },
            workload: true,
          },
          {
            actionValue: "export.png",
            automated: true,
            automatedTestName: "perf: export png stays under budget",
            browser: true,
            browserTestName: "browser perf: export png stays under budget",
            budget: { maxFrameGapMs: 50 },
            completionEvidence: "download",
            controlLabel: "Export PNG",
            expectedObservable: "Export completes without blocking the UI.",
            fixture: "1920x1080 output fixture",
            id: "export-png",
            interaction: "export-copy",
            workload: false,
          },
          {
            automated: true,
            automatedTestName: "perf: preview render stays under budget",
            browser: true,
            browserTestName: "browser perf: preview render stays under budget",
            budget: { maxFrameGapMs: 50 },
            expectedObservable: "Preview renders without freezing.",
            fixture: "1920x1080 output fixture",
            id: "preview-render",
            interaction: "preview-render",
            workload: false,
          },
          {
            automated: true,
            automatedTestName: "perf: animation frame loop stays smooth",
            browser: true,
            browserTestName: "browser perf: animation frame loop stays smooth",
            budget: { maxFrameGapMs: 50 },
            expectedObservable: "Animation advances without frame stalls.",
            fixture: "animated output fixture",
            id: "animation-frame-loop",
            interaction: "animation-frame",
            workload: false,
          },
        ],
        usesCustomRenderer: false,
        workloadTargets: ["generation.prompt"],
      }),
    ).toEqual(
      expect.arrayContaining([
        "char-size-drag control-drag scenario must declare maxInteractionMs and maxFrameGapMs.",
        "export-png export-copy scenario must declare maxExportMs.",
        "preview-render preview-render scenario must declare maxPreviewMs or maxRenderMs.",
        "animation-frame-loop animation-frame scenario must declare maxLongTaskMs.",
      ]),
    );
  });

  it("rejects performance budgets that are too loose to catch lag", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "none",
        rendererWorkload: "none",
        scenarios: [
          {
            automated: true,
            automatedTestName: "perf: char size drag stays responsive",
            browser: true,
            browserTestName: "browser perf: char size drag stays responsive",
            budget: { maxFrameGapMs: 1000, maxInteractionMs: 10000 },
            controlLabel: "Char Size",
            expectedObservable: "Dragging Char Size remains responsive.",
            fixture: "1600x1000 transparent glyph fixture",
            id: "char-size-drag",
            interaction: "control-drag",
            target: "generation.prompt",
            values: { default: 12, max: 32, min: 4 },
            workload: true,
          },
        ],
        usesCustomRenderer: false,
        workloadTargets: ["generation.prompt"],
      }),
    ).toEqual(
      expect.arrayContaining([
        "char-size-drag maxFrameGapMs budget must be <= 120ms, received 1000ms.",
        "char-size-drag maxInteractionMs budget must be <= 2000ms, received 10000ms.",
      ]),
    );
  });

  it("does not let load-profile smooth targets bypass required interaction budgets", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                density: {
                  defaultValue: 4,
                  label: "Density",
                  max: 12,
                  min: 1,
                  performanceReason: "Density changes rendered output size.",
                  performanceRole: "workload",
                  target: "render.density",
                  type: "slider",
                },
              },
              title: "Render",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftPerformanceCoverage(schema, {
        rendererStrategy: "none",
        rendererWorkload: "none",
        scenarios: [
          {
            automated: true,
            automatedTestName: "perf: density drag stays responsive",
            browser: true,
            browserTestName: "browser perf: density drag stays responsive",
            budget: { maxFrameGapMs: 80 },
            controlLabel: "Density",
            expectedObservable: "Dragging Density updates product output without blocking the UI.",
            fixture: "density smooth target fixture",
            id: "density-drag",
            interaction: "control-drag",
            stressFixture: {
              kind: "max-value",
              loadProfile: {
                degradationStepPercent: 10,
                evidence: [
                  {
                    attemptedRatio: 1,
                    attemptedTarget: 12,
                    decision: "Keep 12 as experimental and guarantee smoothness through 11.",
                    measuredResult: "At density 12, maxFrameGapMs 148 exceeded the 80ms budget.",
                    optimizationAttempted:
                      "Cached expensive render inputs and coalesced preview work to requestAnimationFrame.",
                    result: "failed",
                    scenarioId: "density-drag",
                    target: "render.density",
                  },
                ],
                hardLimit: 12,
                metric: "numeric-max",
                smoothTarget: 11,
                smoothTargetRatio: 0.9,
                target: "render.density",
                userFacingRange: "experimental-above-smooth",
              },
              reason: "Density 11 is the measured smooth target after hard-limit testing.",
              value: 11,
            },
            target: "render.density",
            values: { default: 4, max: 12, min: 1 },
            workload: true,
          },
        ],
        usesCustomRenderer: false,
        workloadTargets: ["render.density"],
      }),
    ).toContain("density-drag control-drag scenario must declare maxInteractionMs.");
  });

  it("requires real browser interaction metadata for control performance scenarios", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "none",
        rendererWorkload: "none",
        scenarios: [
          {
            automated: true,
            automatedTestName: "perf: char size drag stays responsive",
            browser: true,
            browserTestName: "browser perf: char size drag stays responsive",
            budget: { maxFrameGapMs: 50, maxInteractionMs: 250 },
            expectedObservable: "Dragging Char Size remains responsive.",
            fixture: "1600x1000 transparent glyph fixture",
            id: "char-size-drag",
            interaction: "control-drag",
            target: "generation.prompt",
            values: { default: 12, max: 32, min: 4 },
            workload: true,
          },
        ],
        usesCustomRenderer: false,
        workloadTargets: ["generation.prompt"],
      }),
    ).toEqual(
      expect.arrayContaining([
        "char-size-drag control-drag scenario must declare controlLabel or uiSelector for its real browser interaction.",
      ]),
    );
  });
});
