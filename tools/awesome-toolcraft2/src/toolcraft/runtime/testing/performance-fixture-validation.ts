import type { ToolcraftControlSchema } from "../schema/types";
import { isSemanticallyHeavyTextControl } from "./performance-control-classification";
import {
  getCountFixtureValue,
  getCustomPerformanceFixtureSemanticErrors,
  getPerformanceFixtureLargeTextValueErrors,
  getPerformanceFixtureMediaValueErrors,
  hasPerformanceFixtureValue,
  isPerformanceFixtureObjectValue,
} from "./performance-fixture-values";
import { getPerformanceLoadProfileErrors } from "./performance-load-profile-validation";
import type {
  ToolcraftPerformanceConfig,
  ToolcraftPerformanceFixture,
  ToolcraftPerformanceFixtureKind,
  ToolcraftPerformanceScenario,
} from "./performance-types";

const performanceFixtureKinds = new Set<ToolcraftPerformanceFixtureKind>([
  "custom",
  "high-density",
  "large-canvas",
  "large-text",
  "many-items",
  "max-value",
  "media",
]);

function isLargeTextWorkloadControl(
  control: ToolcraftControlSchema | undefined,
): boolean {
  if (
    !control ||
    (control.type !== "code" && control.type !== "text" && control.type !== "textarea")
  ) {
    return false;
  }

  return (
    control.type === "code" ||
    control.type === "textarea" ||
    isSemanticallyHeavyTextControl(control)
  );
}

function getPerformanceFixtureShapeErrors(
  scenario: ToolcraftPerformanceScenario,
  fieldName: "stressFixture" | "workloadFixture",
  fixture: ToolcraftPerformanceFixture,
  control: ToolcraftControlSchema | undefined,
  options: {
    requireLargeText?: boolean;
    requireMedia?: boolean;
  } = {},
): string[] {
  const errors: string[] = [];
  const scenarioId = scenario.id;

  if (!performanceFixtureKinds.has(fixture.kind)) {
    errors.push(`${scenarioId} ${fieldName}.kind "${fixture.kind}" is not supported.`);
  }

  if (options.requireMedia) {
    if (fixture.kind !== "media") {
      errors.push(
        `${scenarioId} media-import scenario must use ${fieldName}.kind "media" with a realistic uploaded source size.`,
      );
    }
  }

  if (!fixture.reason.trim()) {
    errors.push(
      `${scenarioId} ${fieldName} must explain why this is the heaviest useful fixture.`,
    );
  }

  if (!hasPerformanceFixtureValue(fixture)) {
    errors.push(
      `${scenarioId} ${fieldName} must include value so browser tests can apply the exact heavy state.`,
    );
  } else if (fixture.kind === "custom") {
    if (!isPerformanceFixtureObjectValue(fixture.value)) {
      errors.push(
        `${scenarioId} custom ${fieldName}.value must be an object with one key per heavy state part so browser tests can apply every key.`,
      );
    } else if (Object.keys(fixture.value).length === 0) {
      errors.push(
        `${scenarioId} custom ${fieldName}.value must include at least one heavy state key.`,
      );
    } else {
      errors.push(
        ...getCustomPerformanceFixtureSemanticErrors(
          scenarioId,
          fieldName,
          fixture.value,
        ),
      );
    }
  } else if (fixture.kind === "media") {
    errors.push(
      ...getPerformanceFixtureMediaValueErrors(
        scenarioId,
        `media ${fieldName}.value`,
        fixture.value,
        "so browser tests can generate or load a realistic source image",
      ),
    );
  }

  if (!options.requireLargeText && fixture.kind !== "large-text") {
    errors.push(...getPerformanceLoadProfileErrors(scenario, fieldName, fixture, control));
    return errors;
  }

  if (fixture.kind !== "large-text") {
    errors.push(
      `${scenarioId} text workload scenario must use ${fieldName}.kind "large-text" with a real long text value.`,
    );
    return errors;
  }

  errors.push(
    ...getPerformanceFixtureLargeTextValueErrors(
      scenarioId,
      `large-text ${fieldName}.value`,
      fixture.value,
      {
        minChars: fixture.minChars,
        minLines: fixture.minLines,
      },
    ),
  );

  errors.push(...getPerformanceLoadProfileErrors(scenario, fieldName, fixture, control));

  return errors;
}

export function getStressFixtureErrors(
  scenario: ToolcraftPerformanceScenario,
  control: ToolcraftControlSchema | undefined,
): string[] {
  const isMediaImport = scenario.interaction === "media-import";

  if (!scenario.workload && scenario.stress !== true && !scenario.stressFixture && !isMediaImport) {
    return [];
  }

  const fixture = scenario.stressFixture;

  if (!fixture) {
    if (isMediaImport) {
      return [
        `${scenario.id} media-import scenario must declare stressFixture.kind "media" with a realistic uploaded source size.`,
      ];
    }

    return scenario.workload
      ? [
          `${scenario.id} workload scenario must declare stressFixture with the real heaviest value used by browser performance tests.`,
        ]
      : [
          `${scenario.id} stress scenario must declare stressFixture with the real heaviest state used by browser performance tests.`,
        ];
  }

  const errors: string[] = [];

  if (isMediaImport && !scenario.workload) {
    errors.push(
      `${scenario.id} media-import scenario must set workload true because decoded source size changes renderer workload.`,
    );
  }

  errors.push(
    ...getPerformanceFixtureShapeErrors(scenario, "stressFixture", fixture, control, {
      requireLargeText: isLargeTextWorkloadControl(control),
      requireMedia: isMediaImport,
    }),
  );

  return errors;
}

function stressFixtureAlreadyDefinesIndependentWorkload(
  scenario: ToolcraftPerformanceScenario,
  control: ToolcraftControlSchema | undefined,
): boolean {
  return (
    scenario.stressFixture?.kind === "large-text" &&
    isLargeTextWorkloadControl(control)
  );
}

function isWorkloadBaselineSensitiveScenario(
  config: ToolcraftPerformanceConfig,
  scenario: ToolcraftPerformanceScenario,
  control: ToolcraftControlSchema | undefined,
): boolean {
  if (
    !scenario.workload ||
    (scenario.interaction !== "control-change" && scenario.interaction !== "control-drag")
  ) {
    return false;
  }

  if (!config.usesCustomRenderer) {
    return false;
  }

  if (config.rendererWorkload === "none" || config.rendererWorkload === "simple-composition") {
    return false;
  }

  return !stressFixtureAlreadyDefinesIndependentWorkload(scenario, control);
}

export function getWorkloadFixtureErrors(
  config: ToolcraftPerformanceConfig,
  scenario: ToolcraftPerformanceScenario,
  control: ToolcraftControlSchema | undefined,
): string[] {
  const requiresBaseline = isWorkloadBaselineSensitiveScenario(config, scenario, control);
  const errors: string[] = [];

  if (scenario.workloadFixture && !scenario.stressFixture) {
    errors.push(
      `${scenario.id} workloadFixture must be paired with stressFixture so tests apply a heavy baseline and then the measured scenario value.`,
    );
  }

  if (!requiresBaseline && !scenario.workloadFixture) {
    return errors;
  }

  const fixture = scenario.workloadFixture;

  if (!fixture) {
    errors.push(
      `${scenario.id} workload control scenario must declare workloadFixture for the app's heavy baseline state; stressFixture covers the control value only.`,
    );
    return errors;
  }

  errors.push(
    ...getPerformanceFixtureShapeErrors(
      scenario,
      "workloadFixture",
      fixture,
      control,
    ),
  );

  return errors;
}
