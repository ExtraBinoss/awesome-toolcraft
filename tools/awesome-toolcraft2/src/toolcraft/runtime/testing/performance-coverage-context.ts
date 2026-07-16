import type { ResolvedToolcraftAppSchema, ToolcraftControlSchema } from "../schema/types";
import type { ToolcraftPerformanceConfig, ToolcraftPerformanceScenario } from "./performance-types";
import { getAllSchemaControls } from "./performance-schema-queries";

export type ToolcraftPerformanceCoverageContext = {
  config: ToolcraftPerformanceConfig;
  controlsByTarget: ReadonlyMap<string, ToolcraftControlSchema>;
  scenariosByTarget: ReadonlyMap<string, readonly ToolcraftPerformanceScenario[]>;
  schema: ResolvedToolcraftAppSchema;
};

export type ToolcraftPerformanceCoverageValidator = (
  context: ToolcraftPerformanceCoverageContext,
) => string[];

export function createToolcraftPerformanceCoverageContext(
  schema: ResolvedToolcraftAppSchema,
  config: ToolcraftPerformanceConfig,
): ToolcraftPerformanceCoverageContext {
  const scenariosByTarget = new Map<string, ToolcraftPerformanceScenario[]>();

  for (const scenario of config.scenarios) {
    if (!scenario.target) continue;
    const scenarios = scenariosByTarget.get(scenario.target) ?? [];
    scenarios.push(scenario);
    scenariosByTarget.set(scenario.target, scenarios);
  }

  return {
    config,
    controlsByTarget: new Map(
      getAllSchemaControls(schema).map((control) => [control.target, control] as const),
    ),
    scenariosByTarget,
    schema,
  };
}

export function runToolcraftPerformanceCoverageValidators(
  context: ToolcraftPerformanceCoverageContext,
  validators: readonly ToolcraftPerformanceCoverageValidator[],
): string[] {
  return validators.flatMap((validate) => validate(context));
}
