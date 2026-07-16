import type { ToolcraftRendererStrategy } from "./performance-types";
import { getBrowserCheckPolicyErrors } from "./performance-browser-policy";
import {
  getRendererPipelineErrors,
  getRendererTechniqueErrors,
  hasDetailHeavyRendererLayer,
  hasHighCountCanvas2DRendererLayer,
  hasLongTaskBudgetScenario,
  hasMainThreadCanvasRasterCompositePreviewPressure,
  hasMeasuredGpuAlternativeEvidence,
  hasStressPreviewOrAnimationScenario,
  hasZoomSensitiveRenderer,
} from "./performance-renderer-validation";
import { hasKeyframeTimeline, hasLayersPanel } from "./performance-schema-queries";
import type { ToolcraftPerformanceCoverageContext } from "./performance-coverage-context";

export function getToolcraftRendererConfigurationCoverageErrors({
  config,
  schema,
}: ToolcraftPerformanceCoverageContext): string[] {
  const errors: string[] = [];
  const customRendererStrategies = new Set<ToolcraftRendererStrategy>([
    "dom",
    "svg",
    "canvas-2d",
    "webgl",
    "webgpu",
  ]);
  const gpuRendererStrategies = new Set<ToolcraftRendererStrategy>(["webgl", "webgpu"]);

  errors.push(...getBrowserCheckPolicyErrors(config));
  errors.push(...getRendererTechniqueErrors(config));
  errors.push(...getRendererPipelineErrors(schema, config));

  if (config.usesCustomRenderer && !customRendererStrategies.has(config.rendererStrategy)) {
    errors.push(
      'Custom renderers must declare rendererStrategy "dom", "svg", "canvas-2d", "webgl", or "webgpu".',
    );
  }

  if (!config.usesCustomRenderer && config.rendererStrategy !== "none") {
    errors.push(
      `Non-custom renderer configs must use rendererStrategy "none", received "${config.rendererStrategy}".`,
    );
  }

  if (config.usesCustomRenderer && config.rendererWorkload === "none") {
    errors.push(
      'Custom renderers must declare rendererWorkload "simple-composition", "text-output", "vector-output", or "pixel-output".',
    );
  }

  if (!config.usesCustomRenderer && config.rendererWorkload !== "none") {
    errors.push(
      `Non-custom renderer configs must use rendererWorkload "none", received "${config.rendererWorkload}".`,
    );
  }

  if (
    hasMainThreadCanvasRasterCompositePreviewPressure(config) &&
    config.rendererWorkload !== "pixel-output"
  ) {
    errors.push(
      `Canvas 2D pipelines with main-thread rasterize/composite preview pressure must use rendererWorkload "pixel-output" or move expensive passes off the main thread; received "${config.rendererWorkload}".`,
    );
  }

  if (
    config.rendererWorkload === "pixel-output" &&
    !gpuRendererStrategies.has(config.rendererStrategy) &&
    (!config.rendererTechnique || !hasMeasuredGpuAlternativeEvidence(config.rendererTechnique))
  ) {
    errors.push(
      `rendererWorkload "pixel-output" should use rendererStrategy "webgl" or "webgpu", received "${config.rendererStrategy}". Keeping a CPU renderer requires rendererTechnique.measuredAlternativeEvidence for WebGL/WebGPU stress comparison.`,
    );
  }

  if (config.rendererWorkload === "pixel-output") {
    if (!hasStressPreviewOrAnimationScenario(config)) {
      errors.push(
        'rendererWorkload "pixel-output" must include a stress preview-render or animation-frame scenario with stress: true for the largest product canvas and heaviest workload values.',
      );
    }

    if (!hasLongTaskBudgetScenario(config)) {
      errors.push(
        'rendererWorkload "pixel-output" must include at least one maxLongTaskMs budget so GPU-backed previews cannot pass while freezing the main thread.',
      );
    }
  }

  if (config.usesCustomRenderer && hasDetailHeavyRendererLayer(config.rendererTechnique)) {
    if (!hasStressPreviewOrAnimationScenario(config)) {
      errors.push(
        "Detail-heavy custom renderers must include a stress preview-render or animation-frame scenario for the largest product canvas and heaviest workload values.",
      );
    }

    if (!hasLongTaskBudgetScenario(config)) {
      errors.push(
        "Detail-heavy custom renderers must include at least one maxLongTaskMs budget so renderer technology can be revised when main-thread work stalls.",
      );
    }
  }

  if (
    config.usesCustomRenderer &&
    hasHighCountCanvas2DRendererLayer(config.rendererTechnique) &&
    !hasStressPreviewOrAnimationScenario(config)
  ) {
    errors.push(
      "High-count Canvas 2D renderer layers must include stress preview-render or animation-frame evidence before delivery. If that stress evidence fails, revise renderer strategy instead of only lowering product workload.",
    );
  }

  return errors;
}

export function getToolcraftCustomRendererInteractionCoverageErrors({
  config,
  schema,
}: ToolcraftPerformanceCoverageContext): string[] {
  const errors: string[] = [];

  if (config.usesCustomRenderer) {
    const interactions = new Set(config.scenarios.map((scenario) => scenario.interaction));
    const hasAnimatedRendererScenario = interactions.has("animation-frame");
    const needsViewportZoomStress =
      hasAnimatedRendererScenario || hasZoomSensitiveRenderer(config);

    for (const requiredInteraction of [
      "preview-render",
      "control-drag",
      "viewport-stability",
    ] as const) {
      if (!interactions.has(requiredInteraction)) {
        errors.push(
          `Custom renderers must include a ${requiredInteraction} performance scenario.`,
        );
      }
    }

    if (hasAnimatedRendererScenario) {
      const hasAnimatedViewportDrag = config.scenarios.some(
        (scenario) =>
          scenario.interaction === "animation-viewport-drag" &&
          scenario.stress === true,
      );

      if (!hasAnimatedViewportDrag) {
        errors.push(
          "Animated custom renderers must include an animation-viewport-drag performance scenario that samples frames while physically moving the canvas viewport.",
        );
      }
    }

    if (needsViewportZoomStress) {
      const hasViewportZoomStress = config.scenarios.some(
        (scenario) =>
          scenario.interaction === "viewport-zoom-stress" &&
          scenario.stress === true,
      );

      if (!hasViewportZoomStress) {
        errors.push(
          "Detail-heavy or animated custom renderers must include a viewport-zoom-stress performance scenario that uses real zoom controls while sampling frame gaps and long tasks.",
        );
      }
    }

    if (schema.canvas.upload) {
      const mediaImportScenarios = config.scenarios.filter(
        (scenario) => scenario.interaction === "media-import",
      );

      if (mediaImportScenarios.length === 0) {
        errors.push(
          "Custom renderers with canvas upload must include a media-import performance scenario.",
        );
      } else if (
        !mediaImportScenarios.some(
          (scenario) => scenario.workload && scenario.stressFixture?.kind === "media",
        )
      ) {
        errors.push(
          'Custom renderers with canvas upload must include a workload media-import performance scenario with stressFixture.kind "media".',
        );
      }
    }

    if (hasKeyframeTimeline(schema)) {
      const hasKeyframeViewportStability = config.scenarios.some(
        (scenario) =>
          scenario.interaction === "viewport-stability" &&
          scenario.target === "timeline.keyframes",
      );

      if (!hasKeyframeViewportStability) {
        errors.push(
          'Keyframe custom renderers must include a viewport-stability performance scenario with target "timeline.keyframes" that exercises zoom/radar, expanded keyframes, keyframe creation, and playback or scrubbing.',
        );
      }
    }

    if (hasLayersPanel(schema)) {
      const hasLayerViewportStability = config.scenarios.some(
        (scenario) =>
          scenario.interaction === "viewport-stability" &&
          scenario.target === "layers.interactions",
      );

      if (!hasLayerViewportStability) {
        errors.push(
          'Layer-enabled custom renderers must include a viewport-stability performance scenario with target "layers.interactions" that exercises zoom/radar, layer selection, visibility, reorder or grouping, and selected-layer output stability.',
        );
      }
    }
  }

  return errors;
}
