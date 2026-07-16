import type {
  ToolcraftActionSchema,
  ToolcraftControlSchema,
} from "@/toolcraft/runtime";

import {
  getActionLabelText,
  getActionSearchText,
  getControlActions,
} from "./actions";
import { getControlLabelText } from "./controls";
import { normalizeToolcraftSemanticText } from "./semantic";
import type { ToolcraftVisibleControl } from "./types";

const MAX_VISUAL_DISCRETE_POSITION_COUNT = 32;

function getStepPositionCount(control: ToolcraftControlSchema): number | undefined {
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
  const intervalCount =
    Math.abs(rawStepCount - roundedStepCount) < Number.EPSILON * 100
      ? roundedStepCount
      : Math.floor(rawStepCount) + 1;

  return Math.max(2, intervalCount + 1);
}

export function getStepMarkerCount(control: ToolcraftControlSchema): number | undefined {
  return getStepPositionCount(control);
}

function isIntegerStepDomain(control: ToolcraftControlSchema): boolean {
  return (
    typeof control.min === "number" &&
    typeof control.max === "number" &&
    typeof control.step === "number" &&
    Number.isInteger(control.min) &&
    Number.isInteger(control.max) &&
    Number.isInteger(control.step)
  );
}

function shouldUseVisualDiscreteSlider(
  control: ToolcraftControlSchema,
): boolean {
  const positionCount = getStepPositionCount(control);

  if (
    control.sliderValueKind !== "discrete" ||
    !positionCount ||
    !isIntegerStepDomain(control)
  ) {
    return false;
  }
  return positionCount <= MAX_VISUAL_DISCRETE_POSITION_COUNT;
}

export function getSliderVariantClassificationErrors({
  control,
  label,
}: {
  control: ToolcraftControlSchema;
  controlId: string;
  label: string;
}): string[] {
  const errors: string[] = [];
  const positionCount = getStepPositionCount(control);

  if (!positionCount) {
    return errors;
  }

  if (
    shouldUseVisualDiscreteSlider(control) &&
    control.variant !== "discrete"
  ) {
    errors.push(
      `${label} has ${positionCount} semantic integer positions and must use variant "discrete" so Toolcraft renders tick markers.`,
    );
  }

  if (
    control.variant === "discrete" &&
    control.sliderValueKind !== "discrete"
  ) {
    errors.push(
      `${label} uses variant "discrete" and must declare sliderValueKind "discrete" so tick semantics are explicit and language-independent.`,
    );
  }

  if (
    control.variant === "discrete" &&
    positionCount > MAX_VISUAL_DISCRETE_POSITION_COUNT
  ) {
    errors.push(
      `${label} declares variant "discrete" with ${positionCount} positions, which would overload tick markers. Keep it stepped continuous or use a different control.`,
    );
  }

  return errors;
}

export function getCodeTextareaControlError({
  control,
  label,
}: {
  control: ToolcraftControlSchema;
  controlId: string;
  label: string;
}): string | undefined {
  if (control.type !== "code" && control.type !== "text") {
    return undefined;
  }

  if (!control.textValueKind) {
    return `${label} must declare textValueKind "single-line", "multiline", or "structured" so TextInput versus CodeTextarea selection does not depend on labels or prose.`;
  }

  if (control.type === "code" && control.textValueKind === "single-line") {
    return `${label} declares textValueKind "single-line" and must use type "text"; reserve type "code" for multiline or structured values.`;
  }

  if (control.type === "text" && control.textValueKind !== "single-line") {
    return `${label} declares textValueKind "${control.textValueKind}" and must use type "code" for multiline or structured values.`;
  }

  return undefined;
}

export function shouldUseSingleCurveVariant(
  control: ToolcraftControlSchema,
): boolean {
  return (
    control.type === "curves" &&
    control.curveIntent === "single-value-map" &&
    control.variant !== "single"
  );
}

export function getCurveIntentError(
  control: ToolcraftControlSchema,
  label: string,
): string | undefined {
  if (control.type !== "curves") {
    return undefined;
  }
  if (!control.curveIntent) {
    return `${label} must declare curveIntent "single-value-map" or "color-channels" so the curve composition does not depend on its label.`;
  }
  if (control.curveIntent === "color-channels" && control.variant === "single") {
    return `${label} declares curveIntent "color-channels" and must use the channel curve composition instead of variant "single".`;
  }
  return undefined;
}

export function getToggleControlLabelError(
  control: ToolcraftControlSchema,
  sectionTitle?: string,
): string | undefined {
  if (control.type !== "switch" && control.type !== "checkbox") {
    return undefined;
  }

  const label = getControlLabelText(control).trim();

  if (/^(enable|disable)\b/i.test(label)) {
    return `toggle labels must name the setting context only; use "CRT", "Background", "Glow", or "Loop" instead of "${label}".`;
  }

  if (
    label &&
    sectionTitle &&
    normalizeToolcraftSemanticText(label) ===
      normalizeToolcraftSemanticText(sectionTitle)
  ) {
    return `toggle label "${label}" duplicates section title "${sectionTitle}". Use a shorter contextual label such as "Include" or rename the toggle to a more specific setting.`;
  }

  return undefined;
}

export function getSingleActionsControlLabelError(
  control: ToolcraftControlSchema,
): string | undefined {
  if (control.type !== "actions") {
    return undefined;
  }

  const actions = getControlActions(control);

  if (actions.length !== 1) {
    return undefined;
  }

  const label = getControlLabelText(control).trim();
  const actionLabel = getActionLabelText(actions[0] as ToolcraftActionSchema | string).trim();

  if (
    label &&
    actionLabel &&
    normalizeToolcraftSemanticText(label) === normalizeToolcraftSemanticText(actionLabel)
  ) {
    return `single Actions control label "${label}" duplicates its only button label "${actionLabel}". Keep the button as the command and use a short context label such as "Ink wash", "Palette action", or "Current layer".`;
  }

  return undefined;
}

export function getTimelineTransportControlText(
  controlId: string,
  control: ToolcraftControlSchema,
): string {
  return [
    controlId,
    control.target,
    getControlLabelText(control),
    ...getControlActions(control).map(getActionSearchText),
  ].join(" ");
}

export function getAnimationIntentControlText({
  control,
  controlId,
  sectionTitle,
}: ToolcraftVisibleControl): string {
  return [
    sectionTitle ?? "",
    controlId,
    control.target,
    getControlLabelText(control),
  ].join(" ");
}

const SEGMENTED_CONTROL_MAX_OPTIONS = 4;
const SEGMENTED_CONTROL_MAX_OPTION_LABEL_LENGTH = 9;
const SEGMENTED_CONTROL_MAX_TOTAL_LABEL_LENGTH = 24;

export function getSegmentedControlLayoutError(
  control: ToolcraftControlSchema,
): string | null {
  if (control.type !== "segmented") {
    return null;
  }

  const labels = control.options?.map((option) => option.label.trim()) ?? [];
  const totalLabelLength = labels.reduce((total, label) => total + label.length, 0);
  const longLabels = labels.filter(
    (label) => label.length > SEGMENTED_CONTROL_MAX_OPTION_LABEL_LENGTH,
  );

  if (
    labels.length > SEGMENTED_CONTROL_MAX_OPTIONS ||
    longLabels.length > 0 ||
    totalLabelLength > SEGMENTED_CONTROL_MAX_TOTAL_LABEL_LENGTH
  ) {
    return [
      `segmented controls must preserve cell padding: use at most ${SEGMENTED_CONTROL_MAX_OPTIONS} short options`,
      `(max ${SEGMENTED_CONTROL_MAX_OPTION_LABEL_LENGTH} characters per label and ${SEGMENTED_CONTROL_MAX_TOTAL_LABEL_LENGTH} total)`,
      "or shorten labels first; if the compact names still exceed the budget, use a select dropdown instead.",
    ].join(" ");
  }

  return null;
}
