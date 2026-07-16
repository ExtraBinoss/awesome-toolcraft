import type {
  ToolcraftPerformanceConfig,
  ToolcraftRendererLayer,
  ToolcraftRendererLayerContent,
  ToolcraftRendererStrategy,
  ToolcraftRendererTechnique,
} from "./performance-types";
import { hasPositiveBudgetField } from "./performance-budget-validation";

const rasterRendererStrategies = new Set<ToolcraftRendererStrategy>([
  "canvas-2d",
  "webgl",
  "webgpu",
]);

const semanticForegroundContent = new Set<ToolcraftRendererLayerContent>([
  "geometry",
  "text",
]);

const detailHeavyRendererContent = new Set<ToolcraftRendererLayerContent>([
  "bitmap-media",
  "dense-pattern",
  "noise",
  "shader",
]);

const vectorLayerRendererStrategies = new Set<ToolcraftRendererStrategy>(["dom", "svg"]);

function hasNonEmptyItems(items: readonly string[]): boolean {
  return items.length > 0;
}

function getLayerContentFamily(content: ToolcraftRendererLayerContent): string {
  if (content === "geometry" || content === "handles") {
    return "vector";
  }

  if (content === "text") {
    return "text";
  }

  if (
    content === "bitmap-media" ||
    content === "dense-pattern" ||
    content === "noise" ||
    content === "shader"
  ) {
    return "pixel";
  }

  return "composite";
}

function hasSemanticForegroundContent(layer: ToolcraftRendererLayer): boolean {
  return layer.content.some((content) => semanticForegroundContent.has(content));
}

export function hasDetailHeavyRendererLayer(
  technique: ToolcraftRendererTechnique | undefined,
): boolean {
  return (technique?.layers ?? []).some(
    (layer) =>
      layer.primitiveCount === "high" ||
      layer.content.some((content) => detailHeavyRendererContent.has(content)),
  );
}

export function hasHighCountCanvas2DRendererLayer(
  technique: ToolcraftRendererTechnique | undefined,
): boolean {
  return (technique?.layers ?? []).some(
    (layer) =>
      layer.renderer === "canvas-2d" &&
      layer.primitiveCount === "high" &&
      (hasSemanticForegroundContent(layer) ||
        layer.content.some((content) => detailHeavyRendererContent.has(content))),
  );
}

function hasDetailHeavyCanvas2DRendererLayer(
  technique: ToolcraftRendererTechnique | undefined,
): boolean {
  return (technique?.layers ?? []).some(
    (layer) =>
      layer.renderer === "canvas-2d" &&
      layer.content.some((content) => detailHeavyRendererContent.has(content)),
  );
}

function getRendererMeasuredAlternativeEvidenceErrors(
  technique: ToolcraftRendererTechnique,
): string[] {
  return (technique.measuredAlternativeEvidence ?? []).flatMap((evidence, index) => {
    const label = `rendererTechnique.measuredAlternativeEvidence[${index}]`;
    const errors: string[] = [];

    if (evidence.alternativeStrategy !== "webgl" && evidence.alternativeStrategy !== "webgpu") {
      errors.push(`${label}.alternativeStrategy must be "webgl" or "webgpu".`);
    }

    if (!evidence.scenarioId.trim()) {
      errors.push(`${label}.scenarioId must name the measured performance scenario.`);
    }

    if (!evidence.fixture.trim()) {
      errors.push(`${label}.fixture must name the exact stress fixture that was measured.`);
    }

    if (!evidence.measuredResult.trim()) {
      errors.push(`${label}.measuredResult must summarize measured frame, interaction, render, or long-task results.`);
    }

    if (!evidence.decision.trim()) {
      errors.push(`${label}.decision must explain why the selected renderer remains appropriate.`);
    }

    return errors;
  });
}

export function hasMeasuredGpuAlternativeEvidence(
  technique: ToolcraftRendererTechnique,
): boolean {
  return (technique.measuredAlternativeEvidence ?? []).some(
    (evidence) =>
      (evidence.alternativeStrategy === "webgl" ||
        evidence.alternativeStrategy === "webgpu") &&
      evidence.scenarioId.trim().length > 0 &&
      evidence.fixture.trim().length > 0 &&
      evidence.measuredResult.trim().length > 0 &&
      evidence.decision.trim().length > 0,
  );
}

export function hasStressPreviewOrAnimationScenario(config: ToolcraftPerformanceConfig): boolean {
  return config.scenarios.some(
    (scenario) =>
      scenario.stress === true &&
      (scenario.interaction === "preview-render" ||
        scenario.interaction === "animation-frame"),
  );
}

export function hasLongTaskBudgetScenario(config: ToolcraftPerformanceConfig): boolean {
  return config.scenarios.some((scenario) =>
    hasPositiveBudgetField(scenario.budget, "maxLongTaskMs"),
  );
}

export function hasZoomSensitiveRenderer(config: ToolcraftPerformanceConfig): boolean {
  return (
    config.rendererWorkload === "text-output" ||
    config.rendererWorkload === "vector-output" ||
    config.rendererWorkload === "pixel-output" ||
    hasDetailHeavyRendererLayer(config.rendererTechnique)
  );
}

function getRendererLayerErrors(technique: ToolcraftRendererTechnique): string[] {
  const errors: string[] = [];
  const layers = technique.layers ?? [];

  if (technique.productRepresentation === "mixed" && layers.length === 0) {
    errors.push(
      'productRepresentation "mixed" requires rendererTechnique.layers so mixed output is machine-checkable.',
    );
  }

  if (technique.productRepresentation === "mixed") {
    const contentFamilies = new Set(
      layers.flatMap((layer) => layer.content.map((content) => getLayerContentFamily(content))),
    );
    contentFamilies.delete("composite");

    if (contentFamilies.size < 2) {
      errors.push(
        'productRepresentation "mixed" requires rendererTechnique.layers with at least two different content families.',
      );
    }
  }

  for (const layer of layers) {
    if (!layer.id.trim()) {
      errors.push("rendererTechnique layers must have non-empty ids.");
    }

    if (!hasNonEmptyItems(layer.content)) {
      errors.push(`rendererTechnique layer "${layer.id}" must list content.`);
    }

    if (
      layer.kind === "product-foreground" &&
      hasSemanticForegroundContent(layer) &&
      layer.primitiveCount !== "high" &&
      rasterRendererStrategies.has(layer.renderer) &&
      !layer.intentionalRasterizationReason?.trim()
    ) {
      errors.push(
        `rendererTechnique layer "${layer.id}" uses ${layer.renderer} for low-count semantic geometry/text. Use dom/svg for semantic foreground or provide intentionalRasterizationReason.`,
      );
    }

    if (
      (layer.kind === "product-foreground" || layer.kind === "editing-handles") &&
      !layer.uiSelector?.trim()
    ) {
      errors.push(
        `rendererTechnique layer "${layer.id}" is ${layer.kind} and must declare uiSelector so browser tests can verify the visible renderer layer.`,
      );
    }

    if (
      layer.kind === "editing-handles" &&
      (!vectorLayerRendererStrategies.has(layer.renderer) || layer.exportMode !== "excluded")
    ) {
      errors.push(
        `rendererTechnique layer "${layer.id}" is editing-handles and must use dom/svg with exportMode "excluded".`,
      );
    }
  }

  return errors;
}

export function getRendererTechniqueErrors(config: ToolcraftPerformanceConfig): string[] {
  const errors: string[] = [];
  const technique = config.rendererTechnique;

  if (config.usesCustomRenderer && !technique) {
    return [
      "Custom renderers must declare rendererTechnique so renderer choice is machine-checkable.",
    ];
  }

  if (!config.usesCustomRenderer && technique) {
    errors.push("Non-custom renderer configs must omit rendererTechnique.");
  }

  if (!technique) {
    return errors;
  }

  if (technique.rendererWorkload !== config.rendererWorkload) {
    errors.push(
      `rendererTechnique.rendererWorkload "${technique.rendererWorkload}" must match rendererWorkload "${config.rendererWorkload}".`,
    );
  }

  if (technique.rendererStrategy !== config.rendererStrategy) {
    errors.push(
      `rendererTechnique.rendererStrategy "${technique.rendererStrategy}" must match rendererStrategy "${config.rendererStrategy}".`,
    );
  }

  if (config.usesCustomRenderer && !hasNonEmptyItems(technique.whyNotAlternativeStrategies)) {
    errors.push(
      "Custom renderer technique must explain why alternative renderer strategies were rejected.",
    );
  }

  if (config.usesCustomRenderer && !hasNonEmptyItems(technique.fidelityRisks)) {
    errors.push("Custom renderer technique must list fidelity risks.");
  }

  if (config.usesCustomRenderer && !hasNonEmptyItems(technique.performanceRisks)) {
    errors.push("Custom renderer technique must list performance risks.");
  }

  errors.push(...getRendererMeasuredAlternativeEvidenceErrors(technique));

  if (
    technique.productRepresentation === "text" &&
    technique.rendererWorkload !== "text-output" &&
    !technique.intentionalRasterizationReason?.trim()
  ) {
    errors.push(
      'productRepresentation "text" requires rendererWorkload "text-output" unless intentionalRasterizationReason is provided.',
    );
  }

  if (
    technique.productRepresentation === "vector" &&
    technique.rendererWorkload !== "vector-output" &&
    !technique.intentionalRasterizationReason?.trim()
  ) {
    errors.push(
      'productRepresentation "vector" requires rendererWorkload "vector-output" unless intentionalRasterizationReason is provided.',
    );
  }

  if (
    technique.productRepresentation === "pixel" &&
    technique.rendererWorkload !== "pixel-output"
  ) {
    errors.push('productRepresentation "pixel" requires rendererWorkload "pixel-output".');
  }

  if (
    technique.previewRenderer !== technique.exportRenderer &&
    technique.exportRenderer !== "none" &&
    !technique.previewExportDifferenceReason?.trim()
  ) {
    errors.push("Different preview/export renderers require previewExportDifferenceReason.");
  }

  if (
    technique.sourceRepresentation === "reference-runtime" &&
    technique.previewRenderer !== technique.rendererStrategy &&
    !technique.referenceRendererChangeReason?.trim()
  ) {
    errors.push("Reference runtime renderer changes require referenceRendererChangeReason.");
  }

  errors.push(...getRendererLayerErrors(technique));

  if (
    config.usesCustomRenderer &&
    technique.rendererStrategy === "canvas-2d" &&
    hasDetailHeavyCanvas2DRendererLayer(technique) &&
    !hasMeasuredGpuAlternativeEvidence(technique)
  ) {
    errors.push(
      "Detail-heavy Canvas 2D renderers must include rendererTechnique.measuredAlternativeEvidence for WebGL/WebGPU stress comparison before keeping the pixel work on CPU.",
    );
  }

  return errors;
}
