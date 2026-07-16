import type {
  ResolvedToolcraftAppSchema,
  ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

import type { ToolcraftBrowserRuntimeRequirement } from "../src/app/test-evidence/browser-runtime-contract";
import { schemaHasVideoExportPanelAction } from "../src/app/acceptance/output-export";
import {
  getRequiredToolcraftControlPartCoverage,
  type ToolcraftBackgroundOutputCoverage,
  type ToolcraftComponentAcceptance,
  type ToolcraftConditionalVisibilityCoverage,
  type ToolcraftTimelinePlaybackCoverage,
} from "../src/app/app-acceptance";

type BrowserAcceptanceRequirementSource = Pick<
  ToolcraftComponentAcceptance,
  | "browser"
  | "browserTestName"
  | "backgroundOutputCoverage"
  | "canvasHandle"
  | "controlPartCoverage"
  | "evidence"
  | "id"
  | "layerCoverage"
  | "referenceCoverage"
  | "referenceTimelineCoverage"
  | "target"
  | "timelineCoverage"
  | "timelinePlaybackCoverage"
  | "visibilityCoverage"
>;

type BrowserSchemaRequirementSource = Pick<ResolvedToolcraftAppSchema, "panels">;

function getAcceptanceEvidenceType(
  evidence: ToolcraftComponentAcceptance["evidence"],
): ToolcraftBrowserRuntimeRequirement["evidenceType"] | undefined {
  switch (evidence) {
    case "product-output":
    case "rendered-pixels":
    case "timeline-output":
      return "product-observable-change";
    case "exported-bytes":
      return "exported-artifact";
    case "command-side-effect":
    case "media-lifecycle":
    case "persistence-state":
    case "viewport-side-effect":
      return evidence;
    default:
      return undefined;
  }
}

const layerEvidenceTypeByCoverage = {
  grouping: "layer-grouping",
  "media-lifecycle": "layer-media-lifecycle",
  reorder: "layer-reorder",
  "selected-layer-controls": "layer-selected-layer-controls",
  selection: "layer-selection",
  visibility: "layer-visibility",
} as const satisfies Record<
  NonNullable<ToolcraftComponentAcceptance["layerCoverage"]>,
  ToolcraftBrowserRuntimeRequirement["evidenceType"]
>;

const timelineEvidenceTypeByCoverage = {
  duration: "timeline-duration",
  loop: "timeline-loop",
  "pause-resume": "timeline-pause-resume",
  "rendered-frame": "timeline-rendered-frame",
  scrub: "timeline-scrub",
} as const satisfies Record<
  ToolcraftTimelinePlaybackCoverage,
  ToolcraftBrowserRuntimeRequirement["evidenceType"]
>;

const timelinePlaybackCoverage = Object.keys(
  timelineEvidenceTypeByCoverage,
) as Array<keyof typeof timelineEvidenceTypeByCoverage>;

const conditionalVisibilityEvidenceTypeByCoverage = {
  hidden: "conditional-control-hidden",
  visible: "conditional-control-visible",
} as const satisfies Record<
  ToolcraftConditionalVisibilityCoverage,
  ToolcraftBrowserRuntimeRequirement["evidenceType"]
>;

const conditionalVisibilityCoverage = Object.keys(
  conditionalVisibilityEvidenceTypeByCoverage,
) as ToolcraftConditionalVisibilityCoverage[];

const backgroundOutputEvidenceTypeByCoverage = {
  "image-transparent-when-excluded": "background-image-transparency",
  "preview-hidden-when-excluded": "background-preview-exclusion",
  "video-background-preserved": "background-video-preserved",
} as const satisfies Record<
  ToolcraftBackgroundOutputCoverage,
  ToolcraftBrowserRuntimeRequirement["evidenceType"]
>;

const backgroundOutputCoverage = Object.keys(
  backgroundOutputEvidenceTypeByCoverage,
) as ToolcraftBackgroundOutputCoverage[];

export function deriveToolcraftBrowserRuntimeRequirements(
  acceptance: readonly BrowserAcceptanceRequirementSource[],
  schema?: BrowserSchemaRequirementSource,
): ToolcraftBrowserRuntimeRequirement[] {
  const controlsByTarget = new Map(
    (schema?.panels.controls?.sections ?? []).flatMap((section) =>
      Object.values(section.controls).flatMap((control) =>
        control.target ? [[control.target, control] as const] : [],
      ),
    ),
  );

  return acceptance.flatMap((entry) => {
    if (!entry.browser) return [];

    const evidenceTypes: ToolcraftBrowserRuntimeRequirement["evidenceType"][] = [];
    const baseEvidenceType = getAcceptanceEvidenceType(entry.evidence);
    if (baseEvidenceType) evidenceTypes.push(baseEvidenceType);

    if (entry.canvasHandle) {
      evidenceTypes.push("canvas-handle-interaction");
    }
    if (entry.timelineCoverage === "keyframes") {
      evidenceTypes.push("timeline-keyframes");
    }
    if (entry.timelineCoverage === "playback") {
      const coverage =
        entry.timelinePlaybackCoverage === "all-playback-behavior"
          ? timelinePlaybackCoverage
          : entry.timelinePlaybackCoverage ?? [];
      evidenceTypes.push(
        ...coverage.map((item) => timelineEvidenceTypeByCoverage[item]),
      );
    }
    if (entry.layerCoverage) {
      evidenceTypes.push(layerEvidenceTypeByCoverage[entry.layerCoverage]);
    }
    if (entry.referenceCoverage || entry.referenceTimelineCoverage) {
      evidenceTypes.push("reference-parity");
    }
    const visibilityCoverage =
      entry.visibilityCoverage === "all-conditional-visibility"
        ? conditionalVisibilityCoverage
        : entry.visibilityCoverage ?? [];
    evidenceTypes.push(
      ...visibilityCoverage.map(
        (item) => conditionalVisibilityEvidenceTypeByCoverage[item],
      ),
    );
    const backgroundCoverage =
      entry.backgroundOutputCoverage === "all-required-background-output"
        ? backgroundOutputCoverage.filter(
            (item) =>
              item !== "video-background-preserved" ||
              (schema ? schemaHasVideoExportPanelAction(schema) : false),
          )
        : entry.backgroundOutputCoverage ?? [];
    evidenceTypes.push(
      ...backgroundCoverage.map(
        (item) => backgroundOutputEvidenceTypeByCoverage[item],
      ),
    );

    const control = entry.target ? controlsByTarget.get(entry.target) : undefined;
    if (control?.type === "segmented") {
      evidenceTypes.push("segmented-control-layout");
    }
    if (
      (control?.type === "slider" || control?.type === "rangeSlider") &&
      control.variant === "discrete"
    ) {
      evidenceTypes.push("discrete-slider-layout");
    }

    const requirements = [...new Set(evidenceTypes)].map((evidenceType) => ({
      evidenceType,
      requirementId: entry.id,
      target: entry.target ?? entry.canvasHandle?.writesTarget,
      testName: entry.browserTestName,
    }));
    const controlParts =
      entry.controlPartCoverage === "all-visible-parts"
        ? control
          ? getRequiredToolcraftControlPartCoverage(control)
          : []
        : entry.controlPartCoverage ?? [];
    for (const part of controlParts) {
      requirements.push({
        evidenceType: "compound-control-part",
        requirementId: `${entry.id}#${part}`,
        target: entry.target,
        testName: entry.browserTestName,
      });
    }
    if (entry.canvasHandle) {
      requirements.push({
        evidenceType: "canvas-export-clean",
        requirementId: entry.id,
        target: entry.canvasHandle.writesTarget,
        testName: entry.canvasHandle.exportCleanTestName,
      });
    }
    return requirements;
  });
}

function fixtureUsesRenderScale(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).some(
    ([key, nestedValue]) =>
      /^(?:canvas\.)?renderScale$|(?:^|[._-])resolutionScale$/iu.test(key) ||
      fixtureUsesRenderScale(nestedValue),
  );
}

const productOutcomePerformanceInteractions = new Set([
  "control-change",
  "control-drag",
  "mask-drag",
  "media-import",
  "preview-render",
  "timeline-playback",
  "timeline-scrub",
]);

export function deriveToolcraftPerformanceRuntimeRequirements(
  scenarios: readonly ToolcraftPerformanceScenario[],
): ToolcraftBrowserRuntimeRequirement[] {
  return scenarios.flatMap((scenario) => {
    if (!scenario.browser) return [];

    const evidenceTypes: ToolcraftBrowserRuntimeRequirement["evidenceType"][] = [
      "performance-measurement",
      "performance-budget",
    ];
    if (productOutcomePerformanceInteractions.has(scenario.interaction)) {
      evidenceTypes.push("performance-product-outcome");
    }
    if (scenario.workload || scenario.stress || scenario.stressFixture) {
      evidenceTypes.push("performance-stress-fixture");
    }
    if (scenario.workloadFixture) {
      evidenceTypes.push("performance-workload-fixture");
    }
    if (scenario.interaction === "export-copy") {
      evidenceTypes.push("performance-output-completion");
    }
    if (
      scenario.interaction === "control-drag" ||
      scenario.interaction === "mask-drag"
    ) {
      evidenceTypes.push("performance-control-drag");
    }
    if (scenario.interaction === "animation-frame") {
      evidenceTypes.push("performance-animation-frames");
    }
    if (
      [
        "animation-viewport-drag",
        "viewport-stability",
        "viewport-zoom-stress",
      ].includes(scenario.interaction)
    ) {
      evidenceTypes.push("performance-viewport");
    }
    if (
      scenario.target === "canvas.renderScale" ||
      fixtureUsesRenderScale(scenario.stressFixture?.value) ||
      fixtureUsesRenderScale(scenario.workloadFixture?.value)
    ) {
      evidenceTypes.push("performance-render-scale");
    }

    return evidenceTypes.map((evidenceType) => ({
      evidenceType,
      requirementId: scenario.id,
      target: scenario.target,
      testName: scenario.browserTestName,
    }));
  });
}
