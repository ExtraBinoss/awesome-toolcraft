import { expect, type Locator, type Page } from "@playwright/test";

import type { ToolcraftPerformanceConfig } from "@/toolcraft/runtime";

import {
  expectToolcraftPerformanceBudget,
  getToolcraftPerformanceStressValue,
} from "./performance-budget-helpers";
import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { getToolcraftFieldByLabel } from "./performance-control-layout-helpers";
import { measureToolcraftInteraction } from "./performance-interaction-measurement";
import type {
  ToolcraftInteractionOptions,
  ToolcraftInteractionResult,
} from "./performance-measurement-evidence";

async function dragToolcraftSliderInField(
  page: Page,
  field: Locator,
  description: string,
  targetRatio: number,
): Promise<void> {
  const slider = field.locator('[data-slot="slider"]').first();
  const sliderValues = field.getByRole("slider");

  await expect(slider, `Toolcraft slider "${description}" should be visible`).toBeVisible();

  const box = await slider.boundingBox();
  if (!box) {
    throw new Error(`Could not measure slider "${description}".`);
  }

  const startX = box.x + box.width * 0.15;
  const endX = box.x + box.width * targetRatio;
  const y = box.y + box.height / 2;
  const valuesBefore = await sliderValues.evaluateAll((elements) =>
    elements.map((element) =>
      element.getAttribute("aria-valuenow") ??
      (element instanceof HTMLInputElement ? element.value : null),
    ),
  );

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 12 });
  await page.mouse.up();

  const valuesAfter = await sliderValues.evaluateAll((elements) =>
    elements.map((element) =>
      element.getAttribute("aria-valuenow") ??
      (element instanceof HTMLInputElement ? element.value : null),
    ),
  );
  expect(
    valuesAfter,
    `Toolcraft slider "${description}" must expose a changed value after its drag interaction.`,
  ).not.toEqual(valuesBefore);
}

export async function dragToolcraftSliderByLabel(
  page: Page,
  label: string,
  targetRatio: number,
  options: { scenarioId?: string } = {},
): Promise<void> {
  if (options.scenarioId) {
    throw new Error(
      "Performance slider evidence must use dragToolcraftSliderByTarget(schemaTarget), not a visible label.",
    );
  }
  const field = await getToolcraftFieldByLabel(page, label);
  await dragToolcraftSliderInField(page, field, label, targetRatio);
}

export async function dragToolcraftSliderByTarget(
  page: Page,
  target: string,
  targetRatio: number,
  options: { scenarioId?: string } = {},
): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  await dragToolcraftSliderInField(page, field, target, targetRatio);
  if (options.scenarioId) {
    await attachToolcraftBrowserRuntimeEvidence({
      evidenceType: "performance-control-drag",
      requirementId: options.scenarioId,
      target,
    });
  }
}

export async function dragToolcraftSliderToValue(
  page: Page,
  label: string,
  value: number,
  options: { scenarioId?: string } = {},
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const slider = field.getByRole("slider").first();

  await expect(slider, `Toolcraft slider "${label}" should be visible`).toBeVisible();

  const range = await slider.evaluate((element) => {
    const htmlElement = element as HTMLElement;
    const min = Number(
      htmlElement.getAttribute("aria-valuemin") ??
        (htmlElement as HTMLInputElement).min ??
        "0",
    );
    const max = Number(
      htmlElement.getAttribute("aria-valuemax") ??
        (htmlElement as HTMLInputElement).max ??
        "100",
    );

    return {
      max: Number.isFinite(max) ? max : 100,
      min: Number.isFinite(min) ? min : 0,
    };
  });
  const denominator = range.max - range.min;
  const ratio = denominator === 0 ? 0 : (value - range.min) / denominator;

  await dragToolcraftSliderByLabel(
    page,
    label,
    Math.min(1, Math.max(0, ratio)),
    options,
  );
}

export async function dragToolcraftSliderTargetToValue(
  page: Page,
  target: string,
  value: number,
  options: { scenarioId?: string } = {},
): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  const slider = field.getByRole("slider").first();
  const range = await slider.evaluate((element) => {
    const htmlElement = element as HTMLElement;
    const min = Number(
      htmlElement.getAttribute("aria-valuemin") ??
        (htmlElement as HTMLInputElement).min ??
        "0",
    );
    const max = Number(
      htmlElement.getAttribute("aria-valuemax") ??
        (htmlElement as HTMLInputElement).max ??
        "100",
    );
    return {
      max: Number.isFinite(max) ? max : 100,
      min: Number.isFinite(min) ? min : 0,
    };
  });
  const denominator = range.max - range.min;
  const ratio = denominator === 0 ? 0 : (value - range.min) / denominator;
  await dragToolcraftSliderByTarget(
    page,
    target,
    Math.min(1, Math.max(0, ratio)),
    options,
  );
}

export async function dragToolcraftSliderToPerformanceStressValue(
  page: Page,
  label: string,
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
): Promise<void> {
  const value = getToolcraftPerformanceStressValue(config, scenarioId);
  const scenario = config.scenarios.find((item) => item.id === scenarioId);

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" must provide a numeric stressFixture.value for slider "${label}".`,
    );
  }
  if (!scenario?.target) {
    throw new Error(
      `Toolcraft slider performance scenario "${scenarioId}" must declare its schema target.`,
    );
  }

  await dragToolcraftSliderTargetToValue(page, scenario.target, value, { scenarioId });
  const field = await getToolcraftControlFieldByTarget(page, scenario.target);
  const observedValues = await field.getByRole("slider").evaluateAll((elements) =>
    elements.map((element) =>
      Number(
        element.getAttribute("aria-valuenow") ??
          (element instanceof HTMLInputElement ? element.value : Number.NaN),
      ),
    ),
  );
  expect(
    observedValues.some((observedValue) => Math.abs(observedValue - value) < 0.000_001),
    `Toolcraft performance scenario "${scenarioId}" must visibly apply stressFixture.value ${value} to slider "${label}".`,
  ).toBe(true);
  await attachToolcraftBrowserRuntimeEvidence({
    evidenceType: "performance-stress-fixture",
    requirementId: scenarioId,
    target: scenario.target,
  });
}

export async function expectToolcraftDiscreteSliderDragSmoothness(
  page: Page,
  label: string,
  options: ToolcraftInteractionOptions & {
    expectMarkers?: boolean;
    maxFrameGapMs?: number;
    maxInteractionMs?: number;
    requirementId?: string;
    target?: string;
  } = {},
): Promise<ToolcraftInteractionResult> {
  const field = options.target
    ? await getToolcraftControlFieldByTarget(page, options.target)
    : await getToolcraftFieldByLabel(page, label);
  const slider = field.locator('[data-slot="slider"][data-variant="discrete"]').first();

  await expect(
    slider,
    `Toolcraft discrete slider "${label}" should render the discrete variant.`,
  ).toBeVisible();

  const markers = field.locator('[data-slot="slider-marker"]');
  if (options.expectMarkers === false) {
    await expect(
      markers,
      `Toolcraft half-width discrete slider "${label}" should hide over-budget tick markers.`,
    ).toHaveCount(0);
  } else {
    await expect(
      markers.first(),
      `Toolcraft discrete slider "${label}" should render tick markers.`,
    ).toBeVisible();
  }

  const result = await measureToolcraftInteraction(
    page,
    async () => {
      if (options.target) {
        await dragToolcraftSliderByTarget(page, options.target, 0.85);
      } else {
        await dragToolcraftSliderByLabel(page, label, 0.85);
      }
    },
    options,
  );

  expectToolcraftPerformanceBudget(result, {
    maxFrameGapMs: options.maxFrameGapMs ?? 80,
    maxInteractionMs: options.maxInteractionMs ?? 500,
  });
  if (options.requirementId) {
    if (!options.target) {
      throw new Error("Discrete-slider runtime evidence requires a schema target.");
    }
    await attachToolcraftBrowserRuntimeEvidence({
      evidenceType: "discrete-slider-layout",
      requirementId: options.requirementId,
      target: options.target,
    });
  }

  return result;
}
