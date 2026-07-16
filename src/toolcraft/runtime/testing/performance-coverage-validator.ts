import type { ResolvedToolcraftAppSchema } from "../schema/types";
import type { ToolcraftPerformanceConfig } from "./performance-types";
import {
  createToolcraftPerformanceCoverageContext,
  runToolcraftPerformanceCoverageValidators,
  type ToolcraftPerformanceCoverageValidator,
} from "./performance-coverage-context";
import {
  getToolcraftCustomRendererInteractionCoverageErrors,
  getToolcraftRendererConfigurationCoverageErrors,
} from "./performance-coverage-renderer-policy";
import { getToolcraftPerformanceScenarioCoverageErrors } from "./performance-coverage-scenario-policy";
import {
  getToolcraftPerformanceOutputCoverageErrors,
  getToolcraftPerformanceTargetCoverageErrors,
} from "./performance-coverage-target-policy";

const toolcraftPerformanceCoverageValidators: readonly ToolcraftPerformanceCoverageValidator[] = [
  getToolcraftRendererConfigurationCoverageErrors,
  getToolcraftPerformanceScenarioCoverageErrors,
  getToolcraftPerformanceTargetCoverageErrors,
  getToolcraftPerformanceOutputCoverageErrors,
  getToolcraftCustomRendererInteractionCoverageErrors,
];

export function validateToolcraftPerformanceCoverage(
  schema: ResolvedToolcraftAppSchema,
  config: ToolcraftPerformanceConfig,
): string[] {
  return runToolcraftPerformanceCoverageValidators(
    createToolcraftPerformanceCoverageContext(schema, config),
    toolcraftPerformanceCoverageValidators,
  );
}
