import type { ToolcraftControlSchema } from "./types";

function isSliderLikeControl(control: ToolcraftControlSchema): boolean {
  return control.type === "slider" || control.type === "rangeSlider";
}

function getStepMarkerCount(control: ToolcraftControlSchema): number | undefined {
  if (
    typeof control.step !== "number" ||
    typeof control.min !== "number" ||
    typeof control.max !== "number" ||
    !Number.isFinite(control.step) ||
    !Number.isFinite(control.min) ||
    !Number.isFinite(control.max) ||
    control.step <= 0 ||
    control.max <= control.min
  ) {
    return undefined;
  }

  const rawStepCount = (control.max - control.min) / control.step;
  const roundedStepCount = Math.round(rawStepCount);
  const stepCount =
    Math.abs(rawStepCount - roundedStepCount) < Number.EPSILON * 100
      ? roundedStepCount
      : Math.floor(rawStepCount) + 1;

  return Math.max(2, stepCount + 1);
}

function normalizeControlSchema(
  control: ToolcraftControlSchema,
): ToolcraftControlSchema {
  if (
    !isSliderLikeControl(control) ||
    typeof control.step !== "number" ||
    control.variant !== "discrete"
  ) {
    return control;
  }

  return {
    ...control,
    markerCount: getStepMarkerCount(control) ?? control.markerCount,
    variant: "discrete",
  };
}

export function createNormalizedControlsRecord(
  entries: readonly [string, ToolcraftControlSchema][],
): Record<string, ToolcraftControlSchema> {
  return Object.fromEntries(
    entries.map(([id, control]) => [id, normalizeControlSchema(control)]),
  );
}
