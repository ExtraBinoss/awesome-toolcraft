import { expect, type Page } from "@playwright/test";

import type { ToolcraftPerformanceConfig } from "@/toolcraft/runtime";

import {
  getToolcraftPerformanceStressValue,
  getToolcraftPerformanceWorkloadValue,
} from "./performance-budget-helpers";
import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";

export type ToolcraftStressFixtureApplyContext = {
  config: ToolcraftPerformanceConfig;
  fixture: Record<string, unknown>;
  key: string;
  page: Page;
  scenarioId: string;
};

export type ToolcraftStressFixtureAppliers = Record<
  string,
  {
    applyValue: (
      value: unknown,
      context: ToolcraftStressFixtureApplyContext,
    ) => Promise<void> | void;
    observeValue: (
      context: ToolcraftStressFixtureApplyContext,
    ) => Promise<unknown> | unknown;
  }
>;

export type ToolcraftScalarFixtureApplication<TValue> = {
  applyValue: (value: TValue) => Promise<void> | void;
  observeValue: () => Promise<TValue> | TValue;
};

function isToolcraftStressFixtureObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertFixtureAppliersCoverKeys(
  scenarioId: string,
  fixtureKind: "stressFixture" | "workloadFixture",
  fixtureKeys: readonly string[],
  appliers: ToolcraftStressFixtureAppliers,
): void {
  const applierLabel = fixtureKind === "stressFixture" ? "fixture" : "workload fixture";
  const missingKeys = fixtureKeys.filter((key) => !appliers[key]);
  if (missingKeys.length > 0) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" is missing ${applierLabel} appliers for: ${missingKeys.join(
        ", ",
      )}.`,
    );
  }

  const extraKeys = Object.keys(appliers).filter((key) => !fixtureKeys.includes(key));
  if (extraKeys.length > 0) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" declares ${applierLabel} appliers not present in ${fixtureKind}.value: ${extraKeys.join(
        ", ",
      )}.`,
    );
  }
}

async function applyToolcraftPerformanceFixture(
  page: Page,
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
  fixtureKind: "stressFixture" | "workloadFixture",
  fixture: unknown,
  appliers: ToolcraftStressFixtureAppliers,
): Promise<Record<string, unknown>> {
  const scenario = config.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) {
    throw new Error(`Toolcraft performance scenario "${scenarioId}" was not found.`);
  }
  if (!isToolcraftStressFixtureObject(fixture)) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" must provide an object ${fixtureKind}.value for ${fixtureKind === "stressFixture" ? "combined fixture" : "baseline fixture"} application.`,
    );
  }

  const fixtureKeys = Object.keys(fixture);
  if (fixtureKeys.length === 0) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" ${fixtureKind}.value must contain at least one key.`,
    );
  }

  assertFixtureAppliersCoverKeys(scenarioId, fixtureKind, fixtureKeys, appliers);

  for (const key of fixtureKeys) {
    await appliers[key]!.applyValue(fixture[key], {
      config,
      fixture,
      key,
      page,
      scenarioId,
    });
  }

  for (const key of fixtureKeys) {
    const observedValue = await appliers[key]!.observeValue({
      config,
      fixture,
      key,
      page,
      scenarioId,
    });
    expect(
      observedValue,
      `Toolcraft performance scenario "${scenarioId}" must preserve the observed fixture value for "${key}" after applying the complete ${fixtureKind}.`,
    ).toEqual(fixture[key]);
  }

  await attachToolcraftBrowserRuntimeEvidence({
    evidenceType:
      fixtureKind === "stressFixture"
        ? "performance-stress-fixture"
        : "performance-workload-fixture",
    requirementId: scenarioId,
    target: scenario.target,
  });

  return fixture;
}

async function applyToolcraftPerformanceScalarFixture<TValue>(
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
  fixtureKind: "stressFixture" | "workloadFixture",
  application: ToolcraftScalarFixtureApplication<TValue>,
): Promise<TValue> {
  const scenario = config.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) {
    throw new Error(`Toolcraft performance scenario "${scenarioId}" was not found.`);
  }
  const value =
    fixtureKind === "stressFixture"
      ? getToolcraftPerformanceStressValue<TValue>(config, scenarioId)
      : getToolcraftPerformanceWorkloadValue<TValue>(config, scenarioId);
  await application.applyValue(value);
  const observedValue = await application.observeValue();
  expect(
    observedValue,
    `Toolcraft performance scenario "${scenarioId}" must expose the observed fixture value after applying ${fixtureKind}.value.`,
  ).toEqual(value);
  await attachToolcraftBrowserRuntimeEvidence({
    evidenceType:
      fixtureKind === "stressFixture"
        ? "performance-stress-fixture"
        : "performance-workload-fixture",
    requirementId: scenarioId,
    target: scenario.target,
  });
  return value;
}

export async function applyToolcraftPerformanceStressValue<TValue>(
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
  application: ToolcraftScalarFixtureApplication<TValue>,
): Promise<TValue> {
  return applyToolcraftPerformanceScalarFixture(
    config,
    scenarioId,
    "stressFixture",
    application,
  );
}

export async function applyToolcraftPerformanceWorkloadValue<TValue>(
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
  application: ToolcraftScalarFixtureApplication<TValue>,
): Promise<TValue> {
  return applyToolcraftPerformanceScalarFixture(
    config,
    scenarioId,
    "workloadFixture",
    application,
  );
}

export async function applyToolcraftPerformanceStressFixture(
  page: Page,
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
  appliers: ToolcraftStressFixtureAppliers,
): Promise<Record<string, unknown>> {
  return applyToolcraftPerformanceFixture(
    page,
    config,
    scenarioId,
    "stressFixture",
    getToolcraftPerformanceStressValue(config, scenarioId),
    appliers,
  );
}

export async function applyToolcraftPerformanceWorkloadFixture(
  page: Page,
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
  appliers: ToolcraftStressFixtureAppliers,
): Promise<Record<string, unknown>> {
  return applyToolcraftPerformanceFixture(
    page,
    config,
    scenarioId,
    "workloadFixture",
    getToolcraftPerformanceWorkloadValue(config, scenarioId),
    appliers,
  );
}
