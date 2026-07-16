import type { ToolcraftControlSchema } from "../schema/types";
import type {
  ToolcraftPerformanceInteraction,
  ToolcraftPerformanceScenario,
} from "./performance-types";

export function hasMinDefaultMax(values: ToolcraftPerformanceScenario["values"]): boolean {
  return values !== undefined && "default" in values && "min" in values && "max" in values;
}

export function getSliderDragControlType(
  control: ToolcraftControlSchema | undefined,
): "rangeSlider" | "slider" | null {
  if (control?.type === "slider" || control?.type === "rangeSlider") {
    return control.type;
  }

  return null;
}

export function hasControlDragScenario(scenarios: readonly ToolcraftPerformanceScenario[]): boolean {
  return scenarios.some((scenario) => scenario.interaction === "control-drag");
}

export function isWorkloadCoverageInteraction(
  interaction: ToolcraftPerformanceInteraction,
  requiresControlDrag: boolean,
): boolean {
  if (requiresControlDrag) {
    return interaction === "control-drag";
  }

  return (
    interaction === "control-change" ||
    interaction === "control-drag" ||
    interaction === "export-copy"
  );
}

export function requiresConcreteUiTarget(interaction: ToolcraftPerformanceInteraction): boolean {
  return (
    interaction === "control-change" ||
    interaction === "control-drag" ||
    interaction === "export-copy" ||
    interaction === "mask-drag" ||
    interaction === "timeline-playback" ||
    interaction === "timeline-scrub"
  );
}
