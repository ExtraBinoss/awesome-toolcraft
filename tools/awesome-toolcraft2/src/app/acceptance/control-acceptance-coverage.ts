import {
  getToolcraftControlKeyframeCapability,
  type ResolvedToolcraftAppSchema,
  type ToolcraftControlSchema,
  type ToolcraftTimelineMode,
} from "@/toolcraft/runtime";

import { getRequiredToolcraftControlPartCoverage } from "./control-parts";
import {
  getBuiltInFitCheckErrors,
  isCustomToolcraftControl,
  requiredCustomControlCoverage,
} from "./custom-controls";
import {
  hasControlPartCoverage,
  hasCustomControlCoverage,
} from "./coverage";
import { getFileDropLifecycleCoverageErrors } from "./media-upload";
import {
  isOutputBackgroundToggleControl,
  schemaHasPngExportPanelAction,
  schemaHasVideoExportPanelAction,
} from "./output-export";
import type {
  ToolcraftBackgroundOutputCoverage,
  ToolcraftComponentAcceptance,
  ToolcraftConditionalVisibilityCoverage,
} from "./types";

function hasTypedCoverage<T extends string>(
  coverage: string | readonly T[] | undefined,
  allCoverageValue: string,
  required: readonly T[],
): boolean {
  return (
    coverage === allCoverageValue ||
    (Array.isArray(coverage) &&
      required.every((requiredItem) => coverage.includes(requiredItem)))
  );
}

function getControlAcceptanceEntryErrors({
  control,
  entry,
  label,
}: {
  control: ToolcraftControlSchema;
  entry: ToolcraftComponentAcceptance;
  label: string;
}): string[] {
  const errors: string[] = [];

  if (!entry.automated) {
    errors.push(`${label} must have automated acceptance coverage.`);
  }

  if (!entry.browser) {
    errors.push(`${label} must have browser acceptance coverage.`);
  }

  if (entry.browser && !entry.browserTestName.trim()) {
    errors.push(`${label} must point to a browser test name.`);
  }

  if (!entry.expectedObservable.trim()) {
    errors.push(`${label} must describe a product-level observable.`);
  }

  if (!entry.automatedTestName.trim()) {
    errors.push(`${label} must point to an automated test name.`);
  }

  if (entry.componentType !== control.type) {
    errors.push(
      `${label} acceptance componentType must be "${control.type}", received "${entry.componentType}".`,
    );
  }

  return errors;
}

function getControlLifecycleAndCustomErrors({
  control,
  entry,
  label,
  schema,
}: {
  control: ToolcraftControlSchema;
  entry: ToolcraftComponentAcceptance;
  label: string;
  schema: ResolvedToolcraftAppSchema;
}): string[] {
  const errors: string[] = [];
  const isCustomControl = isCustomToolcraftControl(control);

  if (control.type === "fileDrop") {
    const hasDefaultMediaAssets = schema.media.defaultAssets.some(
      (asset) => asset.sourceTarget === control.target,
    );

    errors.push(
      ...getFileDropLifecycleCoverageErrors(
        label,
        control,
        entry,
        hasDefaultMediaAssets,
      ),
    );
  }

  if (
    isCustomControl &&
    !hasCustomControlCoverage(
      entry.customControlCoverage,
      requiredCustomControlCoverage,
    )
  ) {
    errors.push(
      `${label} is a custom control and must declare customControlCoverage for: ${requiredCustomControlCoverage.join(", ")}.`,
    );
  }

  if (isCustomControl) {
    errors.push(...getBuiltInFitCheckErrors(label, entry, control));
  }

  return errors;
}

function getControlEvidenceErrors({
  control,
  controlId,
  entry,
  label,
  schema,
  sectionTitle,
}: {
  control: ToolcraftControlSchema;
  controlId: string;
  entry: ToolcraftComponentAcceptance;
  label: string;
  schema: ResolvedToolcraftAppSchema;
  sectionTitle: string | undefined;
}): string[] {
  const errors: string[] = [];

  if (
    control.visibleWhen &&
    !hasTypedCoverage<ToolcraftConditionalVisibilityCoverage>(
      entry.visibilityCoverage,
      "all-conditional-visibility",
      ["hidden", "visible"],
    )
  ) {
    errors.push(
      `${label} uses visibleWhen and must declare visibilityCoverage for both "hidden" and "visible" states reached through ${control.visibleWhen.target}.`,
    );
  }

  if (
    schemaHasPngExportPanelAction(schema) &&
    isOutputBackgroundToggleControl({ control, controlId, sectionTitle })
  ) {
    const requiredCoverage: ToolcraftBackgroundOutputCoverage[] = [
      "preview-hidden-when-excluded",
      "image-transparent-when-excluded",
      ...(schemaHasVideoExportPanelAction(schema)
        ? (["video-background-preserved"] as const)
        : []),
    ];

    if (
      !hasTypedCoverage<ToolcraftBackgroundOutputCoverage>(
        entry.backgroundOutputCoverage,
        "all-required-background-output",
        requiredCoverage,
      )
    ) {
      errors.push(
        `${label} controls background inclusion and must declare backgroundOutputCoverage for: ${requiredCoverage.join(", ")}.`,
      );
    }
  }

  return errors;
}

function getControlPartAndRuntimeCoverageErrors({
  control,
  entry,
  label,
  layersEnabled,
  timelineMode,
}: {
  control: ToolcraftControlSchema;
  entry: ToolcraftComponentAcceptance;
  label: string;
  layersEnabled: boolean;
  timelineMode: ToolcraftTimelineMode | null;
}): string[] {
  const errors: string[] = [];
  const keyframeCapability = getToolcraftControlKeyframeCapability(control);
  const isSelectedLayerTarget = control.target.startsWith("selectedLayer.");
  const requiredControlParts = getRequiredToolcraftControlPartCoverage(control);

  if (!hasControlPartCoverage(entry.controlPartCoverage, requiredControlParts)) {
    errors.push(
      `${label} must declare controlPartCoverage for every semantic value part: ${requiredControlParts.join(", ")}.`,
    );
  }

  if (timelineMode === "keyframes" && keyframeCapability.capable) {
    if (entry.timelineCoverage !== "keyframes") {
      errors.push(
        `${label} is keyframe-capable by Toolcraft control type and must have acceptance timelineCoverage "keyframes" proving its diamond creates/updates a keyframe row and changes evaluated output.`,
      );
    }
  }

  if (
    isSelectedLayerTarget &&
    layersEnabled &&
    entry.layerCoverage !== "selected-layer-controls"
  ) {
    errors.push(
      `${label} targets selectedLayer.* and must have acceptance layerCoverage "selected-layer-controls" proving the control edits the currently selected layer output.`,
    );
  }

  return errors;
}

export function getControlAcceptanceCoverageErrors({
  control,
  controlId,
  entry,
  label,
  layersEnabled,
  schema,
  sectionTitle,
  timelineMode,
}: {
  control: ToolcraftControlSchema;
  controlId: string;
  entry: ToolcraftComponentAcceptance;
  label: string;
  layersEnabled: boolean;
  schema: ResolvedToolcraftAppSchema;
  sectionTitle: string | undefined;
  timelineMode: ToolcraftTimelineMode | null;
}): string[] {
  return [
    ...getControlAcceptanceEntryErrors({ control, entry, label }),
    ...getControlLifecycleAndCustomErrors({ control, entry, label, schema }),
    ...getControlEvidenceErrors({
      control,
      controlId,
      entry,
      label,
      schema,
      sectionTitle,
    }),
    ...getControlPartAndRuntimeCoverageErrors({
      control,
      entry,
      label,
      layersEnabled,
      timelineMode,
    }),
  ];
}
