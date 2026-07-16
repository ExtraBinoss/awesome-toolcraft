import { expect, type Page } from "@playwright/test";

import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";

export async function expectToolcraftCanvasBackingPixelsForRenderScale(
  page: Page,
  canvasSelector: string,
  renderScale: number,
  options: { scenarioId?: string } = {},
): Promise<void> {
  if (!Number.isFinite(renderScale) || renderScale <= 1) {
    throw new Error(
      `Toolcraft render scale backing-pixel checks require a numeric renderScale greater than 1, received ${renderScale}.`,
    );
  }

  const canvas = page.locator(canvasSelector).first();
  await expect(
    canvas,
    `Toolcraft render scale check expected a visible canvas matching "${canvasSelector}".`,
  ).toBeVisible();

  const metrics = await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error("Render scale backing-pixel checks must target an HTMLCanvasElement.");
    }

    const rect = element.getBoundingClientRect();
    return {
      backingHeight: element.height,
      backingWidth: element.width,
      cssHeight: element.clientHeight || rect.height,
      cssWidth: element.clientWidth || rect.width,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  });

  const expectedWidth = metrics.cssWidth * metrics.devicePixelRatio * renderScale;
  const expectedHeight = metrics.cssHeight * metrics.devicePixelRatio * renderScale;

  expect(
    metrics.backingWidth,
    `Expected canvas backing width to honor Resolution scale ${renderScale}.`,
  ).toBeGreaterThanOrEqual(Math.floor(expectedWidth - 1));
  expect(
    metrics.backingHeight,
    `Expected canvas backing height to honor Resolution scale ${renderScale}.`,
  ).toBeGreaterThanOrEqual(Math.floor(expectedHeight - 1));
  if (options.scenarioId) {
    await attachToolcraftBrowserRuntimeEvidence({
      evidenceType: "performance-render-scale",
      requirementId: options.scenarioId,
    });
  }
}
