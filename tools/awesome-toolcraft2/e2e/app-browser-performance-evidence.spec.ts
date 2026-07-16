import { expect, test, type TestInfo } from "@playwright/test";

import {
  TOOLCRAFT_BROWSER_RUNTIME_EVIDENCE_ATTACHMENT_NAME,
  parseToolcraftBrowserRuntimeEvidence,
} from "../src/app/test-evidence/browser-runtime-contract";
import {
  applyToolcraftPerformanceStressFixture,
  applyToolcraftPerformanceStressValue,
} from "./performance-fixture-helpers";
import { measureToolcraftInteraction } from "./performance-probe-helpers";

const fixtureConfig = {
  rendererStrategy: "none",
  rendererWorkload: "none",
  scenarios: [
    {
      automated: true,
      automatedTestName: "perf: fixture outcome",
      browser: true,
      browserTestName: "browser perf: fixture outcome",
      budget: { maxInteractionMs: 1_000 },
      expectedObservable: "The fixture value is applied.",
      fixture: "Fixture outcome",
      id: "fixture-outcome",
      interaction: "control-change",
      stressFixture: { kind: "max-value", reason: "Exercise the maximum.", value: 8 },
      workload: true,
    },
  ],
  usesCustomRenderer: false,
  workloadTargets: [],
} as const;

const objectFixtureConfig = {
  ...fixtureConfig,
  scenarios: [
    {
      ...fixtureConfig.scenarios[0],
      id: "object-fixture-outcome",
      stressFixture: {
        kind: "combined",
        reason: "Exercise the combined final state.",
        value: { first: 1, second: 2 },
      },
    },
  ],
} as const;

function evidenceTypesSince(testInfo: TestInfo, attachmentCount: number) {
  return testInfo.attachments
    .slice(attachmentCount)
    .filter(
      (attachment) =>
        attachment.name === TOOLCRAFT_BROWSER_RUNTIME_EVIDENCE_ATTACHMENT_NAME,
    )
    .map((attachment) => parseToolcraftBrowserRuntimeEvidence(attachment)?.evidenceType);
}

test("performance interaction evidence requires a persistent changed outcome", async ({
  page,
}, testInfo) => {
  await page.setContent('<div id="outcome">before</div>');
  const attachmentCount = testInfo.attachments.length;

  await expect(
    measureToolcraftInteraction(page, async () => undefined, {
      observeOutcome: () => page.locator("#outcome").textContent(),
      outcomeTimeoutMs: 100,
      scenarioId: "no-op-outcome",
    }),
  ).rejects.toThrow(/performance outcome/i);
  expect(evidenceTypesSince(testInfo, attachmentCount)).toEqual([]);

  const result = await measureToolcraftInteraction(
    page,
    () => page.locator("#outcome").evaluate((node) => {
      node.textContent = "after";
    }),
    {
      observeOutcome: () => page.locator("#outcome").textContent(),
      scenarioId: "changed-outcome",
      stabilityIntervalMs: 10,
    },
  );

  expect(Object.isFrozen(result)).toBe(true);
  expect(evidenceTypesSince(testInfo, attachmentCount)).toEqual([
    "performance-product-outcome",
    "performance-measurement",
  ]);

  const mutableOutcome = { value: "before" };
  const mutableAttachmentCount = testInfo.attachments.length;
  await measureToolcraftInteraction(
    page,
    async () => {
      mutableOutcome.value = "after";
    },
    {
      observeOutcome: async () => mutableOutcome,
      scenarioId: "mutable-outcome",
      stabilityIntervalMs: 0,
    },
  );
  expect(evidenceTypesSince(testInfo, mutableAttachmentCount)).toEqual([
    "performance-product-outcome",
    "performance-measurement",
  ]);
});

test("performance interaction rejects autonomous deltas and times an expected semantic outcome", async ({
  page,
}, testInfo) => {
  await page.setContent(`
    <div id="animated-output">0</div>
    <div id="semantic-outcome">idle</div>
    <script>
      let frame = 0;
      setInterval(() => {
        frame += 1;
        document.querySelector("#animated-output").textContent = String(frame);
      }, 8);
    </script>
  `);
  const attachmentCount = testInfo.attachments.length;

  await expect(
    measureToolcraftInteraction(page, async () => undefined, {
      baselineStabilityIntervalMs: 12,
      baselineStabilitySamples: 3,
      observeOutcome: () => page.locator("#animated-output").textContent(),
      outcomeTimeoutMs: 150,
      scenarioId: "autonomous-no-op",
    }),
  ).rejects.toThrow(/baseline must remain stable/u);
  expect(evidenceTypesSince(testInfo, attachmentCount)).toEqual([]);

  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await page.waitForTimeout(40);
      await page.locator("#semantic-outcome").evaluate((node) => {
        node.textContent = "applied";
      });
    },
    {
      expectedOutcome: "applied",
      observeOutcome: () => page.locator("#semantic-outcome").textContent(),
      scenarioId: "expected-semantic-outcome",
      stabilityIntervalMs: 10,
    },
  );

  expect(result.durationMs).toBeGreaterThanOrEqual(30);
  expect(evidenceTypesSince(testInfo, attachmentCount)).toEqual([
    "performance-product-outcome",
    "performance-measurement",
  ]);
});

test("performance fixture evidence requires the declared value to be observable", async ({
  page,
}, testInfo) => {
  await page.setContent('<div id="fixture-value">0</div>');
  const attachmentCount = testInfo.attachments.length;

  await expect(
    applyToolcraftPerformanceStressValue(fixtureConfig, "fixture-outcome", {
      applyValue: async () => undefined,
      observeValue: async () => Number(await page.locator("#fixture-value").textContent()),
    }),
  ).rejects.toThrow(/observed fixture value/i);
  expect(evidenceTypesSince(testInfo, attachmentCount)).toEqual([]);

  await applyToolcraftPerformanceStressValue(fixtureConfig, "fixture-outcome", {
    applyValue: (value) => page.locator("#fixture-value").evaluate((node, nextValue) => {
      node.textContent = String(nextValue);
    }, value),
    observeValue: async () => Number(await page.locator("#fixture-value").textContent()),
  });

  expect(evidenceTypesSince(testInfo, attachmentCount)).toEqual([
    "performance-stress-fixture",
  ]);
});

test("object fixture evidence verifies the complete final state", async ({
  page,
}, testInfo) => {
  const state = { first: 0, second: 0 };
  const attachmentCount = testInfo.attachments.length;

  await expect(
    applyToolcraftPerformanceStressFixture(
      page,
      objectFixtureConfig,
      "object-fixture-outcome",
      {
        first: {
          applyValue: (value) => {
            state.first = Number(value);
          },
          observeValue: () => state.first,
        },
        second: {
          applyValue: (value) => {
            state.second = Number(value);
            state.first = 0;
          },
          observeValue: () => state.second,
        },
      },
    ),
  ).rejects.toThrow(/complete stressFixture/i);
  expect(evidenceTypesSince(testInfo, attachmentCount)).toEqual([]);
});
