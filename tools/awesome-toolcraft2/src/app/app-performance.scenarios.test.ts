import { describe, expect, it } from "vitest";
import {
  collectToolcraftPerformanceSensitiveControls,
  defineToolcraft,
  validateToolcraftPerformanceCoverage,
} from "@/toolcraft/runtime";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("Toolcraft starter performance scenario coverage", () => {
  it("requires workload targets for performance-sensitive schema controls", () => {
    const workloadTargets = new Set(appPerformance.workloadTargets);
    const sensitiveControls = collectToolcraftPerformanceSensitiveControls(appSchema);

    for (const { controlId, target } of sensitiveControls) {
      expect(
        workloadTargets,
        `${controlId} (${target}) looks performance-sensitive and must be listed in workloadTargets or deliberately removed from the app.`,
      ).toContain(target);
    }
  });

  it("rejects reused browser performance tests across scenarios", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "none",
        rendererWorkload: "none",
        scenarios: [
          {
            automated: true,
            automatedTestName: "perf: prompt min change stays responsive",
            browser: true,
            browserTestName: "browser perf: prompt changes stay responsive",
            budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
            controlLabel: "Prompt",
            expectedObservable: "Prompt min edit updates product output.",
            fixture: "starter prompt fixture",
            id: "prompt-min-change",
            interaction: "control-change",
            target: "generation.prompt",
            values: { default: "Describe the effect", max: "Long prompt", min: "" },
            workload: true,
          },
          {
            automated: true,
            automatedTestName: "perf: prompt max change stays responsive",
            browser: true,
            browserTestName: "browser perf: prompt changes stay responsive",
            budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
            controlLabel: "Prompt",
            expectedObservable: "Prompt max edit updates product output.",
            fixture: "starter prompt fixture",
            id: "prompt-max-change",
            interaction: "control-change",
            target: "generation.prompt",
            values: { default: "Describe the effect", max: "Long prompt", min: "" },
            workload: true,
          },
        ],
        usesCustomRenderer: false,
        workloadTargets: ["generation.prompt"],
      }),
    ).toEqual(
      expect.arrayContaining([
        'prompt-max-change browserTestName "browser perf: prompt changes stay responsive" is already used by prompt-min-change. Give each performance scenario its own browser test so every control is actually exercised.',
      ]),
    );
  });

  it("fails custom renderer configs that omit real workload coverage", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, {
        rendererStrategy: "canvas-2d",
        rendererWorkload: "simple-composition",
        scenarios: [
          {
            automated: true,
            automatedTestName: "perf: preview render stays under budget",
            browser: true,
            browserTestName: "browser perf: preview render stays interactive",
            budget: { maxPreviewMs: 100 },
            expectedObservable: "Preview renders without freezing.",
            fixture: "1600x1000 gradient fixture",
            id: "preview-render",
            interaction: "preview-render",
            workload: false,
          },
        ],
        usesCustomRenderer: true,
        workloadTargets: ["generation.prompt"],
      }),
    ).toEqual(
      expect.arrayContaining([
        "Custom renderers must include a control-drag performance scenario.",
        "generation.prompt must have min/default/max workload performance coverage.",
      ]),
    );
  });

  it("requires custom renderers to cover upload, output actions, and viewport stability", () => {
    const outputSchema = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 1080, unit: "px", width: 1920 },
        sizing: { mode: "editable-output" },
        upload: true,
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                export: {
                  actions: [
                    {
                      label: "Export PNG",
                      role: "export-image",
                      value: "export-png",
                    },
                  ],
                  target: "panel.actions",
                  type: "panelActions",
                },
                quality: {
                  defaultValue: 0.5,
                  label: "Quality",
                  max: 1,
                  min: 0,
                  target: "render.quality",
                  type: "slider",
                },
              },
            },
          ],
          title: "Renderer Controls",
        },
      },
    });

    expect(
      validateToolcraftPerformanceCoverage(outputSchema, {
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
            fixture: "1920x1080 output fixture",
            id: "preview-render",
            interaction: "preview-render",
            workload: false,
          },
          {
            automated: true,
            automatedTestName: "perf: quality drag stays responsive",
            browser: true,
            browserTestName: "browser perf: quality drag stays responsive",
            budget: { maxFrameGapMs: 50, maxInteractionMs: 250 },
            controlLabel: "Quality",
            expectedObservable: "Dragging Quality remains responsive.",
            fixture: "1920x1080 output fixture",
            id: "quality-drag",
            interaction: "control-drag",
            target: "render.quality",
            values: { default: 0.5, max: 1, min: 0 },
            workload: true,
          },
        ],
        usesCustomRenderer: true,
        workloadTargets: ["render.quality"],
      }),
    ).toEqual(
      expect.arrayContaining([
        "Custom renderers must include a viewport-stability performance scenario.",
        "Custom renderers with canvas upload must include a media-import performance scenario.",
        "Output actions must include an export-copy performance scenario.",
      ]),
    );
  });

  it("requires keyframe custom renderers to cover viewport stability during keyframe interactions", () => {
    const keyframeSchema = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "intrinsic-media" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                intensity: {
                  defaultValue: 0.5,
                  label: "Intensity",
                  max: 1,
                  min: 0,
                  target: "render.intensity",
                  type: "slider",
                },
              },
              title: "Render",
            },
          ],
          title: "Render Controls",
        },
        timeline: { mode: "keyframes" },
      },
    });

    expect(
      validateToolcraftPerformanceCoverage(keyframeSchema, {
        rendererStrategy: "webgl",
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
            automatedTestName: "perf: intensity drag stays responsive",
            browser: true,
            browserTestName: "browser perf: intensity drag stays responsive",
            budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
            controlLabel: "Intensity",
            expectedObservable: "Dragging Intensity remains responsive.",
            fixture: "1440x1080 shader fixture",
            id: "intensity-drag",
            interaction: "control-drag",
            target: "render.intensity",
            values: { default: 0.5, max: 1, min: 0 },
            workload: true,
          },
          {
            automated: true,
            automatedTestName: "perf: viewport stays stable",
            browser: true,
            browserTestName: "browser perf: viewport stays stable",
            budget: { maxFrameGapMs: 80 },
            expectedObservable: "Changing controls does not move the canvas viewport.",
            fixture: "1440x1080 shader fixture",
            id: "viewport-stability",
            interaction: "viewport-stability",
            target: "render.intensity",
            workload: false,
          },
        ],
        usesCustomRenderer: true,
        workloadTargets: ["render.intensity"],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Keyframe custom renderers must include a viewport-stability performance scenario with target "timeline.keyframes" that exercises zoom/radar, expanded keyframes, keyframe creation, and playback or scrubbing.',
      ]),
    );
  });

  it("requires layer custom renderers to cover viewport stability during layer interactions", () => {
    const layerSchema = defineToolcraft({
      canvas: {
        enabled: true,
        upload: true,
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 1,
                  label: "Opacity",
                  max: 1,
                  min: 0,
                  target: "selectedLayer.opacity",
                  type: "slider",
                },
              },
              title: "Layer",
            },
          ],
          title: "Layer Controls",
        },
        layers: true,
      },
    });

    expect(
      validateToolcraftPerformanceCoverage(layerSchema, {
        rendererStrategy: "webgl",
        rendererWorkload: "simple-composition",
        scenarios: [
          {
            automated: true,
            automatedTestName: "perf: preview render stays under budget",
            browser: true,
            browserTestName: "browser perf: preview render stays under budget",
            budget: { maxPreviewMs: 1000 },
            expectedObservable: "Preview renders without freezing.",
            fixture: "two-layer image fixture",
            id: "preview-render",
            interaction: "preview-render",
            workload: false,
          },
          {
            automated: true,
            automatedTestName: "perf: opacity drag stays responsive",
            browser: true,
            browserTestName: "browser perf: opacity drag stays responsive",
            budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
            controlLabel: "Opacity",
            expectedObservable: "Dragging selected layer opacity remains responsive.",
            fixture: "two-layer image fixture",
            id: "opacity-drag",
            interaction: "control-drag",
            target: "selectedLayer.opacity",
            values: { default: 1, max: 1, min: 0 },
            workload: true,
          },
          {
            automated: true,
            automatedTestName: "perf: viewport stays stable",
            browser: true,
            browserTestName: "browser perf: viewport stays stable",
            budget: { maxFrameGapMs: 80 },
            expectedObservable: "Changing controls does not move the canvas viewport.",
            fixture: "two-layer image fixture",
            id: "viewport-stability",
            interaction: "viewport-stability",
            target: "selectedLayer.opacity",
            workload: false,
          },
        ],
        usesCustomRenderer: true,
        workloadTargets: ["selectedLayer.opacity"],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Layer-enabled custom renderers must include a viewport-stability performance scenario with target "layers.interactions" that exercises zoom/radar, layer selection, visibility, reorder or grouping, and selected-layer output stability.',
      ]),
    );
  });
});
