import { expect, test } from "@playwright/test";
import { performance as nodePerformance } from "node:perf_hooks";

import {
  measureToolcraftInteraction,
  startToolcraftFrameProbe,
} from "./performance-probe-helpers";
import { expectToolcraftPerformanceBudget } from "./performance-budget-helpers";

test("performance probes stop when the measured action fails", async ({ page }) => {
  await page.setContent("<div>failed performance action</div>");

  await expect(
    measureToolcraftInteraction(page, async () => {
      throw new Error("action failed");
    }),
  ).rejects.toThrow("action failed");

  expect(
    await page.evaluate(
      () =>
        (window as Window & { __toolcraftFrameProbe?: { active: boolean } })
          .__toolcraftFrameProbe?.active ?? false,
    ),
  ).toBe(false);
});

test("interaction measurements always observe at least one frame", async ({
  page,
}) => {
  await page.setContent("<div>measured interaction</div>");

  const result = await measureToolcraftInteraction(
    page,
    async () => undefined,
    { settleFrames: 0 },
  );

  expect(result.sampleCount).toBeGreaterThan(0);
});

test("frame probes record a main-thread gap before any navigation", async ({ page }) => {
  await page.setContent("<div>main-thread gap</div>");
  const stopProbe = await startToolcraftFrameProbe(page);

  await page.evaluate(() => {
    const startedAt = performance.now();
    while (performance.now() - startedAt < 80) {
      // Deliberately block the document to verify the raw frame probe first.
    }
  });
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );

  const result = await stopProbe();
  expect(result.maxFrameGapMs).toBeGreaterThanOrEqual(60);
});

test("interaction duration includes latency until the first product outcome", async ({
  page,
}) => {
  await page.setContent('<div id="outcome">before</div>');

  const result = await measureToolcraftInteraction(
    page,
    () =>
      page.locator("#outcome").evaluate((node) => {
        window.setTimeout(() => {
          node.textContent = "after";
        }, 120);
      }),
    {
      observeOutcome: () => page.locator("#outcome").textContent(),
      outcomeTimeoutMs: 1_000,
      settleFrames: 1,
      stabilityIntervalMs: 0,
      stabilitySamples: 2,
    },
  );

  expect(result.durationMs).toBeGreaterThanOrEqual(100);
  expect(() =>
    expectToolcraftPerformanceBudget(result, { maxInteractionMs: 50 }),
  ).toThrow(/50ms/);
});

test("interaction duration excludes post-outcome stability sampling", async ({
  page,
}) => {
  await page.setContent('<div id="outcome">before</div>');

  const wallStartedAt = nodePerformance.now();
  const result = await measureToolcraftInteraction(
    page,
    () =>
      page.locator("#outcome").evaluate((node) => {
        node.textContent = "after";
      }),
    {
      observeOutcome: () => page.locator("#outcome").textContent(),
      settleFrames: 1,
      stabilityIntervalMs: 80,
      stabilitySamples: 3,
    },
  );
  const wallDurationMs = nodePerformance.now() - wallStartedAt;
  const separatingBudgetMs =
    result.durationMs + (wallDurationMs - result.durationMs) / 2;

  expect(wallDurationMs - result.durationMs).toBeGreaterThan(250);
  expect(wallDurationMs).toBeGreaterThan(separatingBudgetMs);
  expect(() =>
    expectToolcraftPerformanceBudget(result, {
      maxInteractionMs: separatingBudgetMs,
    }),
  ).not.toThrow();
});

test("interaction latency captures an outcome that appears during a longer action", async ({
  page,
}) => {
  await page.setContent('<div id="outcome">before</div>');

  let actionDurationMs = 0;
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const actionStartedAt = nodePerformance.now();
      await page.locator("#outcome").evaluate((node) => {
        node.textContent = "after";
      });
      await page.waitForTimeout(180);
      actionDurationMs = nodePerformance.now() - actionStartedAt;
    },
    {
      observeOutcome: () => page.locator("#outcome").textContent(),
      settleFrames: 1,
      stabilityIntervalMs: 0,
      stabilitySamples: 2,
    },
  );

  expect(actionDurationMs - result.durationMs).toBeGreaterThan(100);
});

test("interaction stability is evaluated after a live action crosses its baseline", async ({
  page,
}) => {
  await page.setContent('<div id="outcome">before</div>');

  let actionDurationMs = 0;
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const actionStartedAt = nodePerformance.now();
      const outcome = page.locator("#outcome");
      await outcome.evaluate((node) => {
        node.textContent = "first-change";
      });
      await page.waitForTimeout(30);
      await outcome.evaluate((node) => {
        node.textContent = "before";
      });
      await page.waitForTimeout(30);
      await outcome.evaluate((node) => {
        node.textContent = "final-change";
      });
      actionDurationMs = nodePerformance.now() - actionStartedAt;
    },
    {
      observeOutcome: () => page.locator("#outcome").textContent(),
      outcomePollIntervalMs: 5,
      settleFrames: 1,
      stabilityIntervalMs: 10,
      stabilitySamples: 3,
    },
  );

  expect(actionDurationMs - result.durationMs).toBeGreaterThan(30);
  await expect(page.locator("#outcome")).toHaveText("final-change");
});

test("an outcome timeout during a longer action is reported without leaking the probe", async ({
  page,
}) => {
  await page.setContent('<div id="outcome">before</div>');

  await expect(
    measureToolcraftInteraction(
      page,
      () => page.waitForTimeout(120),
      {
        observeOutcome: () => page.locator("#outcome").textContent(),
        outcomePollIntervalMs: 5,
        outcomeTimeoutMs: 30,
      },
    ),
  ).rejects.toThrow(/should change/);

  expect(
    await page.evaluate(
      () =>
        (window as Window & { __toolcraftFrameProbe?: { active: boolean } })
          .__toolcraftFrameProbe?.active ?? false,
    ),
  ).toBe(false);
});

test("interaction timing and frame sampling survive a document navigation", async ({
  page,
}) => {
  await page.goto('data:text/html,<div id="outcome">before</div>');
  await page.waitForTimeout(150);

  const result = await measureToolcraftInteraction(
    page,
    () => page.goto('data:text/html,<div id="outcome">after</div>').then(() => undefined),
    {
      observeOutcome: () => page.locator("#outcome").textContent(),
      outcomePollIntervalMs: 5,
      settleFrames: 2,
      stabilityIntervalMs: 0,
      stabilitySamples: 2,
    },
  );

  expect(result.durationMs).toBeGreaterThanOrEqual(0);
  expect(result.durationMs).toBeLessThan(500);
  expect(result.sampleCount).toBeGreaterThan(0);
});

test("interaction measurements preserve frame gaps recorded before navigation", async ({
  page,
}) => {
  await page.goto('data:text/html,<div id="outcome">before</div>');
  await page.waitForTimeout(50);

  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await page.evaluate(() => {
        const startedAt = performance.now();
        while (performance.now() - startedAt < 80) {
          // Deliberately block the old document so its frame gap must survive navigation.
        }
      });
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      );
      await page.goto('data:text/html,<div id="outcome">after</div>');
    },
    {
      observeOutcome: () => page.locator("#outcome").textContent(),
      outcomePollIntervalMs: 5,
      settleFrames: 2,
      stabilityIntervalMs: 0,
      stabilitySamples: 2,
    },
  );

  expect(result.maxFrameGapMs).toBeGreaterThanOrEqual(60);
  expect(result.sampleCount).toBeGreaterThan(2);
});

test("restarting a performance probe disconnects the previous observer", async ({ page }) => {
  await page.setContent("<div>probe restart</div>");
  await page.evaluate(() => {
    class ProbeObserver {
      static disconnectCount = 0;
      disconnect() {
        ProbeObserver.disconnectCount += 1;
      }
      observe() {}
      takeRecords(): PerformanceEntryList {
        return [];
      }
    }
    Object.defineProperty(window, "PerformanceObserver", {
      configurable: true,
      value: ProbeObserver,
    });
    (window as Window & { __toolcraftProbeObserver?: typeof ProbeObserver })
      .__toolcraftProbeObserver = ProbeObserver;
  });

  const stopFirst = await startToolcraftFrameProbe(page);
  const stopSecond = await startToolcraftFrameProbe(page);

  expect(
    await page.evaluate(
      () =>
        (window as Window & {
          __toolcraftProbeObserver?: { disconnectCount: number };
        }).__toolcraftProbeObserver?.disconnectCount,
    ),
  ).toBe(1);

  await stopFirst();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __toolcraftFrameProbe?: { active: boolean } })
          .__toolcraftFrameProbe?.active,
    ),
  ).toBe(true);
  await stopSecond();
  expect(
    await page.evaluate(() => {
      const win = window as Window & {
        __toolcraftCompletedFrameProbes?: Record<number, unknown>;
        __toolcraftFrameProbe?: { active: boolean };
      };
      return {
        active: win.__toolcraftFrameProbe?.active ?? false,
        completedProbeCount: Object.keys(
          win.__toolcraftCompletedFrameProbes ?? {},
        ).length,
      };
    }),
  ).toEqual({ active: false, completedProbeCount: 0 });
});
