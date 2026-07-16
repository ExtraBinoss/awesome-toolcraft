import { isToolcraftRuntimeOwnedTarget } from "../schema/runtime-targets";
import {
  collectToolcraftPerformanceRoleConflicts,
  collectToolcraftPerformanceSensitiveControls,
} from "./performance-control-classification";
import {
  getSliderDragControlType,
  hasControlDragScenario,
  hasMinDefaultMax,
  isWorkloadCoverageInteraction,
} from "./performance-scenario-validation";
import {
  getToolcraftControlPerformanceValues,
  getVisiblePerformanceControlTargets,
  hasOutputDeliveryAction,
} from "./performance-schema-queries";
import type { ToolcraftPerformanceCoverageContext } from "./performance-coverage-context";

export function getToolcraftPerformanceTargetCoverageErrors({
  config,
  controlsByTarget,
  scenariosByTarget,
  schema,
}: ToolcraftPerformanceCoverageContext): string[] {
  const errors: string[] = [];

  const performanceTargets = new Set(config.workloadTargets);
  const schemaTargets = new Set(
    (schema.panels.controls?.sections ?? []).flatMap((section) =>
      Object.values(section.controls).map((control) => control.target),
    ),
  );
  const sensitiveTargets = new Set(
    collectToolcraftPerformanceSensitiveControls(schema)
      .map((entry) => entry.target)
      .filter((target) => !isToolcraftRuntimeOwnedTarget(target)),
  );
  const performanceRoleConflicts = collectToolcraftPerformanceRoleConflicts(schema);

  for (const { controlId, target } of performanceRoleConflicts) {
    errors.push(
      `${controlId} (${target}) looks performance-sensitive but declares performanceRole "responsiveness". Use performanceRole "workload" with workloadTargets and min/default/max coverage, or rename/restructure the control if it is truly lightweight.`,
    );
  }

  for (const target of sensitiveTargets) {
    if (!performanceTargets.has(target)) {
      errors.push(
        `${target} is performance-sensitive and must be listed in workloadTargets with min/default/max workload coverage.`,
      );
    }
  }

  for (const target of performanceTargets) {
    if (!schemaTargets.has(target)) {
      errors.push(`Performance workload target ${target} does not exist in schema controls.`);
    }

    const targetScenarios = scenariosByTarget.get(target) ?? [];
    const targetControl = controlsByTarget.get(target);
    const targetRequiresDrag = getSliderDragControlType(targetControl) !== null;
    const hasWorkloadCoverage = targetScenarios.some(
      (scenario) => {
        const values = getToolcraftControlPerformanceValues(targetControl) ?? scenario.values;

        return (
          scenario.workload &&
          isWorkloadCoverageInteraction(scenario.interaction, targetRequiresDrag) &&
          hasMinDefaultMax(values)
        );
      },
    );

    if (!hasWorkloadCoverage) {
      errors.push(
        targetRequiresDrag
          ? `${target} must have min/default/max workload performance coverage through a real control-drag scenario.`
          : `${target} must have min/default/max workload performance coverage.`,
      );
    }
  }

  for (const target of getVisiblePerformanceControlTargets(schema)) {
    if (isToolcraftRuntimeOwnedTarget(target)) {
      continue;
    }

    const targetScenarios = scenariosByTarget.get(target) ?? [];
    const targetControl = controlsByTarget.get(target);
    const sliderControlType = getSliderDragControlType(targetControl);

    if (targetScenarios.length === 0) {
      errors.push(
        `${target} must have a performance scenario because every visible control can affect app responsiveness.`,
      );
    } else if (sliderControlType && !hasControlDragScenario(targetScenarios)) {
      errors.push(
        `${target} is a ${sliderControlType} and must have a control-drag performance scenario proving live canvas/product feedback while dragging.`,
      );
    }
  }

  return errors;
}

export function getToolcraftPerformanceOutputCoverageErrors({
  config,
  schema,
}: ToolcraftPerformanceCoverageContext): string[] {
  const errors: string[] = [];

  if (hasOutputDeliveryAction(schema)) {
    const interactions = new Set(config.scenarios.map((scenario) => scenario.interaction));

    if (!interactions.has("export-copy")) {
      errors.push("Output actions must include an export-copy performance scenario.");
    }
  }

  return errors;
}
