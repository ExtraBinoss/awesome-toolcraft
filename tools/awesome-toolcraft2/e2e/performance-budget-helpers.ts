import { expect } from "@playwright/test";

import type {
  ToolcraftPerformanceBudget,
  ToolcraftPerformanceConfig,
} from "@/toolcraft/runtime";

import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";
import {
  getToolcraftMeasurementProvenance,
  type ToolcraftInteractionResult,
} from "./performance-probe-helpers";

type ToolcraftPerformanceBudgetResult = Partial<ToolcraftInteractionResult> & {
  durationMs?: number;
  exportMs?: number;
  frameGapMs?: number;
  previewMs?: number;
  renderMs?: number;
};

export function getToolcraftPerformanceScenarioBudget(
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
): ToolcraftPerformanceBudget {
  const scenario = config.scenarios.find((item) => item.id === scenarioId);

  if (!scenario) {
    throw new Error(`Toolcraft performance scenario "${scenarioId}" was not found.`);
  }

  return scenario.budget;
}

export function getToolcraftPerformanceStressValue<TValue = unknown>(
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
): TValue {
  const scenario = config.scenarios.find((item) => item.id === scenarioId);

  if (!scenario) {
    throw new Error(`Toolcraft performance scenario "${scenarioId}" was not found.`);
  }

  if (
    !scenario.stressFixture ||
    !Object.prototype.hasOwnProperty.call(scenario.stressFixture, "value")
  ) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" does not declare stressFixture.value.`,
    );
  }

  return scenario.stressFixture.value as TValue;
}

export function getToolcraftPerformanceWorkloadValue<TValue = unknown>(
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
): TValue {
  const scenario = config.scenarios.find((item) => item.id === scenarioId);

  if (!scenario) {
    throw new Error(`Toolcraft performance scenario "${scenarioId}" was not found.`);
  }

  if (
    !scenario.workloadFixture ||
    !Object.prototype.hasOwnProperty.call(scenario.workloadFixture, "value")
  ) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" does not declare workloadFixture.value.`,
    );
  }

  return scenario.workloadFixture.value as TValue;
}

export async function expectToolcraftScenarioPerformanceBudget(
  result: ToolcraftPerformanceBudgetResult,
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
): Promise<void> {
  const scenario = config.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) {
    throw new Error(`Toolcraft performance scenario "${scenarioId}" was not found.`);
  }
  const provenance = getToolcraftMeasurementProvenance(
    result,
  );
  if (
    provenance?.scenarioId !== scenarioId ||
    provenance.target !== scenario.target
  ) {
    throw new Error(
      `Toolcraft performance budget "${scenarioId}" requires a result created by a protected measurement helper for the same scenario and schema target.`,
    );
  }
  expectToolcraftPerformanceBudget(
    result,
    getToolcraftPerformanceScenarioBudget(config, scenarioId),
  );
  await attachToolcraftBrowserRuntimeEvidence({
    evidenceType: "performance-budget",
    requirementId: scenarioId,
    target: scenario.target,
  });
}

export function expectToolcraftPerformanceBudget(
  result: ToolcraftPerformanceBudgetResult,
  budget: ToolcraftPerformanceBudget,
): void {
  if (typeof budget.maxInteractionMs === "number") {
    expect(
      result.durationMs,
      `Expected interaction duration to stay within ${budget.maxInteractionMs}ms.`,
    ).toBeLessThanOrEqual(budget.maxInteractionMs);
  }

  if (typeof budget.maxFrameGapMs === "number") {
    expect(
      result.sampleCount,
      "Frame-gap budgets require at least one observed animation frame.",
    ).toBeGreaterThan(0);
    expect(
      result.maxFrameGapMs ?? result.frameGapMs,
      `Expected frame gaps to stay within ${budget.maxFrameGapMs}ms.`,
    ).toBeLessThanOrEqual(budget.maxFrameGapMs);
  }

  if (typeof budget.maxLongTaskMs === "number") {
    expect(
      result.longTaskMaxMs,
      `Expected long tasks to stay within ${budget.maxLongTaskMs}ms.`,
    ).toBeLessThanOrEqual(budget.maxLongTaskMs);
  }

  if (typeof budget.maxExportMs === "number") {
    expect(
      result.exportMs ?? result.durationMs,
      `Expected export/copy duration to stay within ${budget.maxExportMs}ms.`,
    ).toBeLessThanOrEqual(budget.maxExportMs);
  }

  if (typeof budget.maxPreviewMs === "number") {
    expect(
      result.previewMs ?? result.durationMs,
      `Expected preview duration to stay within ${budget.maxPreviewMs}ms.`,
    ).toBeLessThanOrEqual(budget.maxPreviewMs);
  }

  if (typeof budget.maxRenderMs === "number") {
    expect(
      result.renderMs ?? result.durationMs,
      `Expected render duration to stay within ${budget.maxRenderMs}ms.`,
    ).toBeLessThanOrEqual(budget.maxRenderMs);
  }
}
