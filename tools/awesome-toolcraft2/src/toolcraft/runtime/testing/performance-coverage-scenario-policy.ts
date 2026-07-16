import {
  getBudgetCapErrors,
  getMissingInteractionBudgetFields,
  hasAnyBudget,
} from "./performance-budget-validation";
import {
  getStressFixtureErrors,
  getWorkloadFixtureErrors,
} from "./performance-fixture-validation";
import { arePerformanceFixtureValuesEqual } from "./performance-fixture-values";
import {
  hasMinDefaultMax,
  requiresConcreteUiTarget,
} from "./performance-scenario-validation";
import {
  getToolcraftControlPerformanceValues,
  hasOutputDeliveryActionReference,
} from "./performance-schema-queries";
import type { ToolcraftPerformanceCoverageContext } from "./performance-coverage-context";

export function getToolcraftPerformanceScenarioCoverageErrors({
  config,
  controlsByTarget,
  schema,
}: ToolcraftPerformanceCoverageContext): string[] {
  const errors: string[] = [];
  const browserTestNamesByScenario = new Map<string, string>();

  for (const scenario of config.scenarios) {
    if (!scenario.id.trim()) {
      errors.push("Performance scenario is missing an id.");
    }

    if (!scenario.fixture.trim()) {
      errors.push(`${scenario.id} must name a representative fixture.`);
    }

    if (!scenario.expectedObservable.trim()) {
      errors.push(`${scenario.id} must describe a product-level performance observable.`);
    }

    if (!hasAnyBudget(scenario.budget)) {
      errors.push(`${scenario.id} must declare at least one numeric performance budget.`);
    }

    const missingBudgetFields = getMissingInteractionBudgetFields(scenario);
    if (missingBudgetFields.length > 0) {
      errors.push(
        `${scenario.id} ${scenario.interaction} scenario must declare ${missingBudgetFields.join(
          " and ",
        )}.`,
      );
    }

    errors.push(...getBudgetCapErrors(scenario));

    if (!scenario.automated || !scenario.automatedTestName.trim()) {
      errors.push(`${scenario.id} must point to an automated performance test.`);
    }

    if (!scenario.browser || !scenario.browserTestName.trim()) {
      errors.push(`${scenario.id} must point to a browser performance test.`);
    }

    if (scenario.browser && scenario.browserTestName.trim()) {
      const previousScenarioId = browserTestNamesByScenario.get(scenario.browserTestName);

      if (previousScenarioId) {
        errors.push(
          `${scenario.id} browserTestName "${scenario.browserTestName}" is already used by ${previousScenarioId}. Give each performance scenario its own browser test so every control is actually exercised.`,
        );
      } else {
        browserTestNamesByScenario.set(scenario.browserTestName, scenario.id);
      }
    }

    const scenarioControl = controlsByTarget.get(scenario.target ?? "");
    const schemaPerformanceValues = getToolcraftControlPerformanceValues(scenarioControl);

    if (scenario.workload && scenario.interaction !== "media-import") {
      if (schemaPerformanceValues) {
        if (
          scenario.values &&
          (!arePerformanceFixtureValuesEqual(
            scenario.values.default,
            schemaPerformanceValues.default,
          ) ||
            !arePerformanceFixtureValuesEqual(
              scenario.values.max,
              schemaPerformanceValues.max,
            ) ||
            !arePerformanceFixtureValuesEqual(
              scenario.values.min,
              schemaPerformanceValues.min,
            ))
        ) {
          errors.push(
            `${scenario.id} values redefine schema range for "${scenario.target}"; expected ${JSON.stringify(
              schemaPerformanceValues,
            )}. Omit values to use the schema-derived range.`,
          );
        }
      } else if (!hasMinDefaultMax(scenario.values)) {
        errors.push(`${scenario.id} workload scenario must include min/default/max values.`);
      }
    }

    errors.push(...getStressFixtureErrors(scenario, scenarioControl));
    errors.push(...getWorkloadFixtureErrors(config, scenario, scenarioControl));

    if (
      requiresConcreteUiTarget(scenario.interaction) &&
      !scenario.controlLabel?.trim() &&
      !scenario.uiSelector?.trim() &&
      !(scenario.interaction === "export-copy" && scenario.actionValue?.trim())
    ) {
      errors.push(
        `${scenario.id} ${scenario.interaction} scenario must declare controlLabel or uiSelector for its real browser interaction.`,
      );
    }

    if (scenario.interaction === "export-copy") {
      if (!scenario.actionValue?.trim()) {
        errors.push(
          `${scenario.id} export-copy scenario must declare actionValue for the exact output delivery action it exercises.`,
        );
      } else if (!scenario.controlLabel?.trim()) {
        errors.push(
          `${scenario.id} export-copy scenario must declare controlLabel for the visible output delivery action it clicks.`,
        );
      } else if (
        scenario.completionEvidence !== "download" &&
        scenario.completionEvidence !== "clipboard"
      ) {
        errors.push(
          `${scenario.id} export-copy scenario must declare completionEvidence as download or clipboard.`,
        );
      } else if (!hasOutputDeliveryActionReference(schema, scenario)) {
        errors.push(
          `${scenario.id} export-copy scenario references actionValue "${scenario.actionValue.trim()}" with label "${scenario.controlLabel.trim()}", but schema panelActions has no matching output delivery action.`,
        );
      }
    }
  }

  return errors;
}
