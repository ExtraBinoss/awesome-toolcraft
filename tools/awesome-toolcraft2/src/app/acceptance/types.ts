import type {
  ToolcraftBuiltInControlType as RuntimeToolcraftBuiltInControlType,
  ToolcraftControlOrderRole,
  ToolcraftControlSchema,
} from "@/toolcraft/runtime";
import { TOOLCRAFT_BUILT_IN_CONTROL_TYPES } from "@/toolcraft/runtime";

export type ToolcraftAcceptanceEvidence =
  | "command-side-effect"
  | "exported-bytes"
  | "media-lifecycle"
  | "persistence-state"
  | "product-output"
  | "rendered-pixels"
  | "timeline-output"
  | "viewport-side-effect";

export type ToolcraftReferenceCoverage =
  | "canvas-sizing"
  | "control-mapping"
  | "export-at-time"
  | "export-copy"
  | "media-lifecycle"
  | "pause-resume"
  | "renderer-loop"
  | "renderer-state"
  | "restart"
  | "spawn-update-cadence"
  | "time-progress";

export type ToolcraftReferenceTimelineCoverage =
  | "all-range"
  | "duration"
  | "export-at-time"
  | "export-range"
  | "jump-to-trim-start"
  | "keyframes"
  | "loop"
  | "playback"
  | "range-playback"
  | "restart"
  | "scrub"
  | "state-jump"
  | "time-progress"
  | "trim-range";

export type ToolcraftTimelinePlaybackCoverage =
  | "duration"
  | "loop"
  | "pause-resume"
  | "rendered-frame"
  | "scrub";

export type ToolcraftCanvasSizingCoverage = "fixed-output-size" | "intrinsic-media-size";

export type ToolcraftPersistenceCoverage = "reload";

export type ToolcraftSettingsTransferCoverage = "opt-out";

export type ToolcraftConditionalVisibilityCoverage = "hidden" | "visible";

export type ToolcraftBackgroundOutputCoverage =
  | "image-transparent-when-excluded"
  | "preview-hidden-when-excluded"
  | "video-background-preserved";

export type ToolcraftMediaLifecycleCoverage =
  | "default-remove"
  | "default-reset"
  | "flip"
  | "order-output"
  | "remove"
  | "reorder"
  | "reset"
  | "rotate"
  | "transform-output"
  | "upload";

export type ToolcraftAutonomousAnimationCoverage =
  | "no-duration-control"
  | "no-export-at-time"
  | "no-loop-control"
  | "no-play-pause"
  | "no-scrub"
  | "no-user-facing-transport";

export type ToolcraftTimelineLoopDurationSource =
  | "product-derived"
  | "reference"
  | "user-request";

export type ToolcraftTimelineLoopDurationIntent = {
  evidence: string;
  seconds: number;
  source: ToolcraftTimelineLoopDurationSource;
};

export type ToolcraftTimelineLoopProof = {
  direction: "forward-only";
  durationChange: "reproved-after-edit";
  reversePlayback: "forbidden";
  seam: "first-last-match";
};

export type ToolcraftAnimationIntent =
  | {
      mode: "none";
    }
  | {
      behaviorCoverage: readonly ToolcraftAutonomousAnimationCoverage[];
      mode: "autonomous";
      reason: string;
    }
  | {
      loopDuration: ToolcraftTimelineLoopDurationIntent;
      mode: "timeline-keyframes";
    }
  | {
      loopDuration: ToolcraftTimelineLoopDurationIntent;
      mode: "timeline-playback";
    };

export type ToolcraftReferenceTimelineMode =
  | "custom-reference-timeline"
  | "none"
  | "toolcraft-keyframes"
  | "toolcraft-playback";

export type ToolcraftReferenceTimelineContract = {
  behaviorCoverage: readonly ToolcraftReferenceTimelineCoverage[];
  loopDuration?: ToolcraftTimelineLoopDurationIntent;
  mode: ToolcraftReferenceTimelineMode;
};

export type ToolcraftReferenceStudyStatus =
  | "ran-original"
  | "restored-local"
  | "source-inspection-only";

export type ToolcraftReferenceStudyEvidence = {
  behaviorEvidence: string;
  referenceLocation: string;
  reproductionSteps: string;
  sourceEvidence: string;
  sourceOnlyReason?: string;
  status: ToolcraftReferenceStudyStatus;
};

export type ToolcraftVideoReferenceStoryboardFrame = {
  behaviorObservation: string;
  frameId: string;
  frameSource: string;
  timeSeconds: number;
  visualObservation: string;
};

export type ToolcraftVideoReferenceTransition = {
  behaviorDelta: string;
  fromFrameId: string;
  id: string;
  toFrameId: string;
};

export type ToolcraftVideoReferenceAcceptanceMapping = {
  acceptanceId: string;
  behavior: string;
  frameIds: readonly string[];
};

export type ToolcraftVideoReferenceStudyEvidence = {
  acceptanceMapping: readonly ToolcraftVideoReferenceAcceptanceMapping[];
  behaviorDecomposition: string;
  extractionEvidence: string;
  referenceLocation: string;
  storyboard: readonly ToolcraftVideoReferenceStoryboardFrame[];
  transitionAnalysis: readonly ToolcraftVideoReferenceTransition[];
};

export type ToolcraftReferenceFeatureStatus =
  | "intentionally-changed"
  | "ported"
  | "toolcraft-native";

export type ToolcraftReferenceFeatureInventoryItem = {
  acceptanceId: string;
  behaviorEvidence: string;
  featureName: string;
  id: string;
  referenceBehavior: string;
  sourceEvidence: string;
  status: ToolcraftReferenceFeatureStatus;
  toolcraftMapping: string;
  userApprovedChangeReason?: string;
};

export type ToolcraftLayerCoverage =
  | "grouping"
  | "media-lifecycle"
  | "reorder"
  | "selected-layer-controls"
  | "selection"
  | "visibility";

export type ToolcraftControlPartCoverage =
  | "anchorGrid.position"
  | "channelMixer.activeChannel"
  | "channelMixer.values"
  | "curves.activeChannel"
  | "curves.points"
  | "colorOpacity.hex"
  | "colorOpacity.opacity"
  | "fontPicker.color"
  | "fontPicker.fontId"
  | "fontPicker.fontSize"
  | "fontPicker.fontWeight"
  | "fontPicker.letterSpacing"
  | "fontPicker.lineHeight"
  | "fontPicker.opacity"
  | "fontPicker.textCase"
  | "gradient.angle"
  | "gradient.gradientType"
  | "gradient.stops.color"
  | "gradient.stops.opacity"
  | "gradient.stops.position"
  | "palette.family"
  | "palette.shade"
  | "rangeInput.end"
  | "rangeInput.start"
  | "rangeSlider.lower"
  | "rangeSlider.upper"
  | "vector.x"
  | "vector.y";

export type ToolcraftCustomControlCoverage =
  | "built-in-gap"
  | "kit-primitives"
  | "minimal-ui"
  | "product-output"
  | "runtime-state";

export const builtInToolcraftControlTypeValues =
  TOOLCRAFT_BUILT_IN_CONTROL_TYPES;

export type ToolcraftBuiltInControlType = RuntimeToolcraftBuiltInControlType;

export type ToolcraftBuiltInFitCheck = {
  capabilities: readonly ToolcraftCustomControlCapability[];
  checkedBuiltIns: readonly ToolcraftBuiltInControlType[];
  closestBuiltIn: ToolcraftBuiltInControlType | "none";
  productObservable: string;
  whyInsufficient: string;
};

export type ToolcraftCustomControlCapability =
  | "collection"
  | "commands"
  | "custom-interaction"
  | "custom-value-model"
  | "custom-visualization"
  | "reorder"
  | "selection";

export type ToolcraftTransferMode =
  | {
      animationIntent?: ToolcraftAnimationIntent;
      mode: "new-toolcraft-app";
      videoReferenceStudy?: ToolcraftVideoReferenceStudyEvidence;
    }
  | {
      animationIntent?: ToolcraftAnimationIntent;
      behaviorCoverage: readonly ToolcraftReferenceCoverage[];
      mode: "reference-runtime-clone";
      referenceFeatureInventory?: readonly ToolcraftReferenceFeatureInventoryItem[];
      referenceName: string;
      referenceStudy?: ToolcraftReferenceStudyEvidence;
      referenceTimeline: ToolcraftReferenceTimelineContract;
      sourceOfTruth: "reference-runtime";
      videoReferenceStudy?: ToolcraftVideoReferenceStudyEvidence;
    };

export type ToolcraftProductReadiness =
  | {
      mode: "starter";
      reason: string;
    }
  | {
      mode: "product";
      productName: string;
      productSummary: string;
      requestedBehavior: string;
    };

export type ToolcraftComponentAcceptance = {
  actionCoverage?: readonly string[];
  automated: boolean;
  automatedTestName: string;
  browser: boolean;
  browserTestName: string;
  componentType: string;
  evidence: ToolcraftAcceptanceEvidence;
  expectedObservable: string;
  fixture: string;
  id: string;
  canvasHandle?: {
    exportCleanTestName: string;
    outputObservable: string;
    testId: string;
    writesTarget: string;
  };
  kind: "canvas-handle" | "control" | "runtime";
  canvasSizingCoverage?: ToolcraftCanvasSizingCoverage;
  layerCoverage?: ToolcraftLayerCoverage;
  mediaLifecycleCoverage?: readonly ToolcraftMediaLifecycleCoverage[];
  optionCoverage?: "each-visible-item" | readonly string[];
  persistenceCoverage?: ToolcraftPersistenceCoverage;
  referenceCoverage?: ToolcraftReferenceCoverage;
  referenceTimelineCoverage?: ToolcraftReferenceTimelineCoverage;
  settingsTransferCoverage?: ToolcraftSettingsTransferCoverage;
  target?: string;
  timelineCoverage?: "keyframes" | "playback";
  timelinePlaybackCoverage?:
    | "all-playback-behavior"
    | readonly ToolcraftTimelinePlaybackCoverage[];
  timelineLoopProof?: ToolcraftTimelineLoopProof;
  controlPartCoverage?:
    | "all-visible-parts"
    | readonly ToolcraftControlPartCoverage[];
  customControlCoverage?:
    | "all-custom-control-behavior"
    | readonly ToolcraftCustomControlCoverage[];
  builtInFitCheck?: ToolcraftBuiltInFitCheck;
  backgroundOutputCoverage?:
    | "all-required-background-output"
    | readonly ToolcraftBackgroundOutputCoverage[];
  userAction: string;
  visibilityCoverage?:
    | "all-conditional-visibility"
    | readonly ToolcraftConditionalVisibilityCoverage[];
};

export type ToolcraftVisibleControl = {
  control: ToolcraftControlSchema;
  controlId: string;
  sectionTitle?: string;
};

export type ToolcraftControlOrderItem = {
  controlId: string;
  rank: number;
  role: ToolcraftControlOrderRole;
  sectionTitle?: string;
  target: string;
  type: string;
};

export type ToolcraftControlSectionInventoryEntry = {
  entity?: string;
  groupingReason: string;
  splitReason?: string;
  targets: readonly string[];
  title: string;
  workflowStage?: string;
};
