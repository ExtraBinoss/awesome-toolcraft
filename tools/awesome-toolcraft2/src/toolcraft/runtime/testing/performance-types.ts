import type { ToolcraftControlSchema } from "../schema/types";

export type ToolcraftPerformanceInteraction =
  | "animation-frame"
  | "animation-viewport-drag"
  | "control-change"
  | "control-drag"
  | "export-copy"
  | "mask-drag"
  | "media-import"
  | "preview-render"
  | "timeline-playback"
  | "timeline-scrub"
  | "viewport-zoom-stress"
  | "viewport-stability";

export type ToolcraftOutputCompletionEvidence = "clipboard" | "download";

export type ToolcraftPerformanceCoverage = {
  automated: boolean;
  automatedTestName: string;
  browser: boolean;
  browserTestName: string;
};

export type ToolcraftBrowserCheckPreferredRunner = "agent-browser";

export type ToolcraftBrowserCheckFallbackRunner = "playwright";

export type ToolcraftBrowserCheckFallbackCondition =
  | "agent-browser-unavailable"
  | "ci";

export type ToolcraftBrowserCheckPolicy = {
  fallbackRunner: ToolcraftBrowserCheckFallbackRunner;
  fallbackWhen: readonly ToolcraftBrowserCheckFallbackCondition[];
  preferredRunner: ToolcraftBrowserCheckPreferredRunner;
};

export type ToolcraftPerformanceBudget = {
  maxExportMs?: number;
  maxFrameGapMs?: number;
  maxInteractionMs?: number;
  maxLongTaskMs?: number;
  maxPreviewMs?: number;
  maxRenderMs?: number;
};

export type ToolcraftPerformanceValueSet = {
  default: unknown;
  max?: unknown;
  min?: unknown;
};

export type ToolcraftPerformanceFixtureKind =
  | "custom"
  | "high-density"
  | "large-canvas"
  | "large-text"
  | "many-items"
  | "max-value"
  | "media";

export type ToolcraftPerformanceLoadMetric =
  | "canvas-area"
  | "count"
  | "custom"
  | "media-area"
  | "numeric-max"
  | "numeric-min"
  | "text-length";

export type ToolcraftPerformanceUserFacingRange =
  | "experimental-above-smooth"
  | "fully-guaranteed";

export type ToolcraftPerformanceLoadEvidence = {
  attemptedRatio: number;
  attemptedTarget: unknown;
  decision: string;
  measuredResult: string;
  optimizationAttempted?: string;
  result: "failed" | "passed";
  scenarioId: string;
  target: string;
};

export type ToolcraftPerformanceLoadProfile = {
  degradationStepPercent?: 10;
  evidence?: readonly ToolcraftPerformanceLoadEvidence[];
  hardLimit: unknown;
  metric: ToolcraftPerformanceLoadMetric;
  smoothTarget: unknown;
  smoothTargetRatio: number;
  target: string;
  userFacingRange: ToolcraftPerformanceUserFacingRange;
};

export type ToolcraftPerformanceFixture = {
  kind: ToolcraftPerformanceFixtureKind;
  loadProfile?: ToolcraftPerformanceLoadProfile;
  minChars?: number;
  minCount?: number;
  minLines?: number;
  reason: string;
  value?: unknown;
};

export type ToolcraftPerformanceStressFixtureKind = ToolcraftPerformanceFixtureKind;
export type ToolcraftPerformanceStressFixture = ToolcraftPerformanceFixture;
export type ToolcraftPerformanceWorkloadFixture = ToolcraftPerformanceFixture;

type ToolcraftPerformanceScenarioBase = ToolcraftPerformanceCoverage & {
  budget: ToolcraftPerformanceBudget;
  controlLabel?: string;
  expectedObservable: string;
  fixture: string;
  id: string;
  target?: string;
  stress?: boolean;
  stressFixture?: ToolcraftPerformanceStressFixture;
  workloadFixture?: ToolcraftPerformanceWorkloadFixture;
  uiSelector?: string;
  values?: ToolcraftPerformanceValueSet;
  workload: boolean;
};

type ToolcraftExportCopyPerformanceScenario = ToolcraftPerformanceScenarioBase & {
  actionValue: string;
  completionEvidence: ToolcraftOutputCompletionEvidence;
  controlLabel: string;
  interaction: "export-copy";
};

type ToolcraftNonExportPerformanceScenario = ToolcraftPerformanceScenarioBase & {
  actionValue?: never;
  completionEvidence?: never;
  interaction: Exclude<ToolcraftPerformanceInteraction, "export-copy">;
};

export type ToolcraftPerformanceScenario =
  | ToolcraftExportCopyPerformanceScenario
  | ToolcraftNonExportPerformanceScenario;

export type ToolcraftRendererStrategy =
  | "none"
  | "dom"
  | "svg"
  | "canvas-2d"
  | "webgl"
  | "webgpu";

export type ToolcraftRendererWorkload =
  | "none"
  | "simple-composition"
  | "text-output"
  | "vector-output"
  | "pixel-output";

export type ToolcraftSourceRepresentation =
  | "reference-runtime"
  | "dom-text"
  | "svg"
  | "canvas-2d"
  | "webgl-texture"
  | "webgpu-texture"
  | "image-media"
  | "video-media"
  | "procedural-data"
  | "mixed";

export type ToolcraftProductRepresentation =
  | "text"
  | "vector"
  | "pixel"
  | "video"
  | "mixed";

export type ToolcraftPreviewRenderer =
  | "dom"
  | "svg"
  | "canvas-2d"
  | "webgl"
  | "webgpu";

export type ToolcraftExportRenderer =
  | "none"
  | "dom"
  | "svg"
  | "canvas-2d"
  | "webgl"
  | "webgpu"
  | "media-recorder"
  | "webcodecs";

export type ToolcraftRendererLayerKind =
  | "background"
  | "product-foreground"
  | "editing-handles"
  | "export-composite";

export type ToolcraftRendererLayerContent =
  | "bitmap-media"
  | "composite"
  | "dense-pattern"
  | "geometry"
  | "handles"
  | "noise"
  | "shader"
  | "text";

export type ToolcraftRendererLayerPrimitiveCount = "low" | "medium" | "high";

export type ToolcraftRendererLayerExportMode =
  | "included"
  | "excluded"
  | "composited";

export type ToolcraftRendererLayer = {
  content: readonly ToolcraftRendererLayerContent[];
  exportMode: ToolcraftRendererLayerExportMode;
  id: string;
  intentionalRasterizationReason?: string;
  kind: ToolcraftRendererLayerKind;
  primitiveCount: ToolcraftRendererLayerPrimitiveCount;
  renderer: Exclude<ToolcraftRendererStrategy, "none">;
  uiSelector?: string;
};

export type ToolcraftRendererMeasuredAlternativeEvidence = {
  alternativeStrategy: "webgl" | "webgpu";
  decision: string;
  fixture: string;
  measuredResult: string;
  scenarioId: string;
};

export type ToolcraftRendererTechnique = {
  exportRenderer: ToolcraftExportRenderer;
  fidelityRisks: readonly string[];
  intentionalRasterizationReason?: string;
  layers?: readonly ToolcraftRendererLayer[];
  measuredAlternativeEvidence?: readonly ToolcraftRendererMeasuredAlternativeEvidence[];
  performanceRisks: readonly string[];
  previewExportDifferenceReason?: string;
  previewRenderer: ToolcraftPreviewRenderer;
  productRepresentation: ToolcraftProductRepresentation;
  referenceRendererChangeReason?: string;
  rendererStrategy: ToolcraftRendererStrategy;
  rendererWorkload: ToolcraftRendererWorkload;
  sourceRepresentation: ToolcraftSourceRepresentation;
  whyNotAlternativeStrategies: readonly string[];
};

export type ToolcraftRenderPassKind =
  | "decode"
  | "preprocess"
  | "pixel-transform"
  | "vector-build"
  | "text-layout"
  | "rasterize"
  | "composite"
  | "handles"
  | "export";

export type ToolcraftRenderPassRunLocation =
  | "main"
  | "worker"
  | "gpu"
  | "worker-or-gpu"
  | "export-only";

export type ToolcraftRenderPassOutput =
  | "source"
  | "intermediate"
  | "preview"
  | "overlay"
  | "export";

export type ToolcraftRenderPassQuality = "preview" | "full" | "retina" | "export";

export type ToolcraftRenderPass = {
  cacheKey?: readonly string[];
  id: string;
  inputs: readonly string[];
  invalidatedBy: readonly string[];
  kind: ToolcraftRenderPassKind;
  output: ToolcraftRenderPassOutput;
  quality: ToolcraftRenderPassQuality;
  runsOn: ToolcraftRenderPassRunLocation;
};

export type ToolcraftPipelineInteraction =
  | "animation-frame"
  | "control-change"
  | "control-drag"
  | "media-import"
  | "mask-drag"
  | "viewport-drag"
  | "viewport-zoom"
  | "timeline-playback"
  | "timeline-scrub"
  | "export";

export type ToolcraftInteractionInvalidation = {
  interaction: ToolcraftPipelineInteraction;
  invalidates: readonly string[];
  mustNotInvalidate?: readonly string[];
  targets: readonly string[];
};

export type ToolcraftRendererPipeline = {
  interactionInvalidation: readonly ToolcraftInteractionInvalidation[];
  passes: readonly ToolcraftRenderPass[];
};

export type ToolcraftPerformanceConfig = {
  browserCheckPolicy?: ToolcraftBrowserCheckPolicy;
  rendererPipeline?: ToolcraftRendererPipeline;
  rendererStrategy: ToolcraftRendererStrategy;
  rendererTechnique?: ToolcraftRendererTechnique;
  rendererWorkload: ToolcraftRendererWorkload;
  scenarios: readonly ToolcraftPerformanceScenario[];
  usesCustomRenderer: boolean;
  workloadTargets: readonly string[];
};

export type ToolcraftPerformanceSensitiveControl = {
  control: ToolcraftControlSchema;
  controlId: string;
  target: string;
};

export type ToolcraftUnclassifiedPerformanceControl = {
  control: ToolcraftControlSchema;
  controlId: string;
  target: string;
};
