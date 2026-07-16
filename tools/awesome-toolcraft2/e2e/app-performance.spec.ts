import { expect, test } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";

test("browser perf: declared renderer layer selectors are present", async ({ page }) => {
  if (!appPerformance.usesCustomRenderer) {
    return;
  }

  const visibleLayers =
    appPerformance.rendererTechnique?.layers?.filter((layer) => layer.uiSelector) ?? [];

  await page.goto("/");

  for (const layer of visibleLayers) {
    await expect(
      page.locator(layer.uiSelector!).first(),
      `renderer layer "${layer.id}" should exist at ${layer.uiSelector}`,
    ).toBeVisible();
  }
});
