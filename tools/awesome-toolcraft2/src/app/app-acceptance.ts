import {
  getToolcraftControlKeyframeCapability,
  type ResolvedToolcraftAppSchema,
} from "@/toolcraft/runtime";

import { getRequiredToolcraftControlPartCoverage } from "./acceptance/control-parts";
import {
  getToolcraftControlOrder as getToolcraftControlOrderForSchema,
  getToolcraftControlOrderTargets as getToolcraftControlOrderTargetsForSchema,
  inferToolcraftControlOrderRole,
} from "./acceptance/control-order";
import type {
  ToolcraftAcceptanceEvidence,
  ToolcraftAnimationIntent,
  ToolcraftAutonomousAnimationCoverage,
  ToolcraftBuiltInControlType,
  ToolcraftBuiltInFitCheck,
  ToolcraftBackgroundOutputCoverage,
  ToolcraftCanvasSizingCoverage,
  ToolcraftConditionalVisibilityCoverage,
  ToolcraftComponentAcceptance,
  ToolcraftControlOrderItem,
  ToolcraftControlPartCoverage,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftCustomControlCoverage,
  ToolcraftLayerCoverage,
  ToolcraftPersistenceCoverage,
  ToolcraftProductReadiness,
  ToolcraftReferenceCoverage,
  ToolcraftReferenceFeatureInventoryItem,
  ToolcraftReferenceFeatureStatus,
  ToolcraftReferenceStudyEvidence,
  ToolcraftReferenceStudyStatus,
  ToolcraftReferenceTimelineContract,
  ToolcraftReferenceTimelineCoverage,
  ToolcraftReferenceTimelineMode,
  ToolcraftSettingsTransferCoverage,
  ToolcraftTimelineLoopDurationIntent,
  ToolcraftTimelineLoopDurationSource,
  ToolcraftTimelinePlaybackCoverage,
  ToolcraftTransferMode,
  ToolcraftVideoReferenceAcceptanceMapping,
  ToolcraftVideoReferenceStoryboardFrame,
  ToolcraftVideoReferenceStudyEvidence,
  ToolcraftVideoReferenceTransition,
  ToolcraftVisibleControl,
} from "./acceptance/types";
import {
  collectToolcraftVisibleAcceptanceControls,
  validateToolcraftAcceptanceDiagnostics as validateToolcraftAcceptanceDiagnosticsInput,
  validateToolcraftAcceptanceCoverage as validateToolcraftAcceptanceInput,
  type ToolcraftAcceptanceValidationInput,
} from "./acceptance/validate-coverage";
import type { ToolcraftAcceptanceDiagnostic } from "./acceptance/validation-pipeline";
import {
  appAcceptance,
  appControlSectionInventory,
  appProductReadiness,
  appTransferMode,
} from "./app-acceptance-data";
import { appSchema } from "./app-schema";

export {
  getRequiredToolcraftControlPartCoverage,
  inferToolcraftControlOrderRole,
  appAcceptance,
  appControlSectionInventory,
  appProductReadiness,
  appTransferMode,
};
export type {
  ToolcraftAcceptanceEvidence,
  ToolcraftAcceptanceDiagnostic,
  ToolcraftAnimationIntent,
  ToolcraftAutonomousAnimationCoverage,
  ToolcraftBuiltInControlType,
  ToolcraftBuiltInFitCheck,
  ToolcraftBackgroundOutputCoverage,
  ToolcraftCanvasSizingCoverage,
  ToolcraftConditionalVisibilityCoverage,
  ToolcraftComponentAcceptance,
  ToolcraftControlOrderItem,
  ToolcraftControlPartCoverage,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftCustomControlCoverage,
  ToolcraftLayerCoverage,
  ToolcraftPersistenceCoverage,
  ToolcraftProductReadiness,
  ToolcraftReferenceCoverage,
  ToolcraftReferenceFeatureInventoryItem,
  ToolcraftReferenceFeatureStatus,
  ToolcraftReferenceStudyEvidence,
  ToolcraftReferenceStudyStatus,
  ToolcraftReferenceTimelineContract,
  ToolcraftReferenceTimelineCoverage,
  ToolcraftReferenceTimelineMode,
  ToolcraftSettingsTransferCoverage,
  ToolcraftTimelineLoopDurationIntent,
  ToolcraftTimelineLoopDurationSource,
  ToolcraftTimelinePlaybackCoverage,
  ToolcraftTransferMode,
  ToolcraftVideoReferenceAcceptanceMapping,
  ToolcraftVideoReferenceStoryboardFrame,
  ToolcraftVideoReferenceStudyEvidence,
  ToolcraftVideoReferenceTransition,
  ToolcraftVisibleControl,
};

export function validateToolcraftAcceptanceDiagnostics(
  input: ToolcraftAcceptanceValidationInput,
): ToolcraftAcceptanceDiagnostic[] {
  return validateToolcraftAcceptanceDiagnosticsInput(input);
}

export function collectToolcraftVisibleControls(
  schema: ResolvedToolcraftAppSchema = appSchema,
): ToolcraftVisibleControl[] {
  return collectToolcraftVisibleAcceptanceControls(schema);
}

export function collectToolcraftKeyframeableControls(
  schema: ResolvedToolcraftAppSchema = appSchema,
): ToolcraftVisibleControl[] {
  return collectToolcraftVisibleControls(schema).filter(
    ({ control }) => getToolcraftControlKeyframeCapability(control).capable,
  );
}

export function getToolcraftControlOrder(
  schema: ResolvedToolcraftAppSchema = appSchema,
): ToolcraftControlOrderItem[] {
  return getToolcraftControlOrderForSchema(schema);
}

export function getToolcraftControlOrderTargets(
  schema: ResolvedToolcraftAppSchema = appSchema,
): string[] {
  return getToolcraftControlOrderTargetsForSchema(schema);
}

function isToolcraftAcceptanceValidationInput(
  value: ToolcraftAcceptanceValidationInput | ResolvedToolcraftAppSchema,
): value is ToolcraftAcceptanceValidationInput {
  return (
    "acceptance" in value &&
    "schema" in value &&
    "sectionInventory" in value &&
    "transferMode" in value
  );
}

export function validateToolcraftAcceptanceCoverage(
  input: ToolcraftAcceptanceValidationInput,
): string[];
export function validateToolcraftAcceptanceCoverage(
  schema?: ResolvedToolcraftAppSchema,
  acceptance?: readonly ToolcraftComponentAcceptance[],
  transferMode?: ToolcraftTransferMode,
  sectionInventory?: readonly ToolcraftControlSectionInventoryEntry[],
): string[];
export function validateToolcraftAcceptanceCoverage(
  inputOrSchema: ToolcraftAcceptanceValidationInput | ResolvedToolcraftAppSchema = appSchema,
  acceptance: readonly ToolcraftComponentAcceptance[] = appAcceptance,
  transferMode: ToolcraftTransferMode = appTransferMode,
  sectionInventory: readonly ToolcraftControlSectionInventoryEntry[] =
    appControlSectionInventory,
): string[] {
  const input = isToolcraftAcceptanceValidationInput(inputOrSchema)
    ? inputOrSchema
    : {
        acceptance,
        schema: inputOrSchema,
        sectionInventory,
        transferMode,
      };

  return validateToolcraftAcceptanceInput(input);
}

export function validateProductAcceptanceCoverage(): string[] {
  return validateToolcraftAcceptanceCoverage({
    acceptance: appAcceptance,
    schema: appSchema,
    sectionInventory: appControlSectionInventory,
    transferMode: appTransferMode,
  });
}
