import { expect, type Page } from "@playwright/test";

import {
  measureToolcraftInteraction,
  waitForToolcraftAnimationFrames,
  type ToolcraftInteractionOptions,
  type ToolcraftInteractionResult,
} from "./performance-probe-helpers";
import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";

export async function dragToolcraftCanvasViewport(
  page: Page,
  delta: { x: number; y: number } = { x: 96, y: -64 },
  options: { scenarioId?: string } = {},
): Promise<void> {
  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  await expect(viewport, "Toolcraft canvas viewport should be visible").toBeVisible();

  const box = await viewport.boundingBox();
  if (!box) {
    throw new Error("Could not measure Toolcraft canvas viewport.");
  }

  const startX = box.x + box.width * 0.5;
  const startY = box.y + box.height * 0.5;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + delta.x, startY + delta.y, { steps: 16 });
  await page.mouse.up();
  if (options.scenarioId) {
    await attachToolcraftBrowserRuntimeEvidence({
      evidenceType: "performance-viewport",
      requirementId: options.scenarioId,
    });
  }
}

export async function zoomToolcraftCanvasViewport(
  page: Page,
  repetitions = 2,
  options: { scenarioId?: string } = {},
): Promise<void> {
  const zoomIn = page.getByRole("button", { name: "Zoom in" });
  const zoomOut = page.getByRole("button", { name: "Zoom out" });

  await expect(zoomIn, "Toolcraft zoom-in control should be visible").toBeVisible();
  await expect(zoomOut, "Toolcraft zoom-out control should be visible").toBeVisible();

  for (let index = 0; index < repetitions; index += 1) {
    await zoomIn.click();
    await waitForToolcraftAnimationFrames(page, 2);
  }

  for (let index = 0; index < repetitions; index += 1) {
    await zoomOut.click();
    await waitForToolcraftAnimationFrames(page, 2);
  }
  if (options.scenarioId) {
    await attachToolcraftBrowserRuntimeEvidence({
      evidenceType: "performance-viewport",
      requirementId: options.scenarioId,
    });
  }
}

export async function readToolcraftCanvasViewport(page: Page): Promise<{
  offsetX: number;
  offsetY: number;
  zoom: number;
}> {
  return page.evaluate(() => {
    const canvas = document.querySelector("[data-toolcraft-editable-canvas]");
    const style = canvas ? window.getComputedStyle(canvas) : null;
    const zoomText =
      canvas?.getAttribute("data-canvas-zoom") ??
      style?.getPropertyValue("--canvas-zoom") ??
      "1";

    return {
      offsetX: Number(canvas?.getAttribute("data-canvas-offset-x") ?? 0),
      offsetY: Number(canvas?.getAttribute("data-canvas-offset-y") ?? 0),
      zoom: Number.parseFloat(zoomText) || 1,
    };
  });
}

export async function expectToolcraftCanvasViewportStable(
  page: Page,
  action: () => Promise<void>,
  options: ToolcraftInteractionOptions & {
    maxOffsetDelta?: number;
    maxZoomDelta?: number;
  } = {},
): Promise<ToolcraftInteractionResult> {
  const before = await readToolcraftCanvasViewport(page);
  const result = await measureToolcraftInteraction(page, action, options);
  const after = await readToolcraftCanvasViewport(page);
  const maxOffsetDelta = options.maxOffsetDelta ?? 0.5;
  const maxZoomDelta = options.maxZoomDelta ?? 0.001;

  expect(
    Math.abs(after.offsetX - before.offsetX),
    `Expected canvas offsetX to stay stable within ${maxOffsetDelta}px.`,
  ).toBeLessThanOrEqual(maxOffsetDelta);
  expect(
    Math.abs(after.offsetY - before.offsetY),
    `Expected canvas offsetY to stay stable within ${maxOffsetDelta}px.`,
  ).toBeLessThanOrEqual(maxOffsetDelta);
  expect(
    Math.abs(after.zoom - before.zoom),
    `Expected canvas zoom to stay stable within ${maxZoomDelta}.`,
  ).toBeLessThanOrEqual(maxZoomDelta);

  if (options.scenarioId) {
    await attachToolcraftBrowserRuntimeEvidence({
      evidenceType: "performance-viewport",
      requirementId: options.scenarioId,
    });
  }

  return result;
}
