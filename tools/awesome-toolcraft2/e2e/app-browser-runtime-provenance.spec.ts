import { expect, test, type TestInfo } from "@playwright/test";

import {
  TOOLCRAFT_BROWSER_RUNTIME_EVIDENCE_ATTACHMENT_NAME,
  TOOLCRAFT_BROWSER_RUNTIME_EVIDENCE_CONTENT_TYPE,
  parseToolcraftBrowserRuntimeEvidence,
} from "../src/app/test-evidence/browser-runtime-contract";
import {
  expectToolcraftAcceptanceOutcome,
  expectToolcraftReferenceParity,
} from "./browser-acceptance-outcome-helpers";
import { expectToolcraftLayerSelection } from "./browser-layer-evidence-helpers";
import { createToolcraftBrowserProofSession } from "./browser-proof-session";
import { expectToolcraftScenarioPerformanceBudget } from "./performance-budget-helpers";
import { measureToolcraftInteraction } from "./performance-probe-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { expectToolcraftTimelineDuration } from "./browser-timeline-evidence-helpers";

test("performance budgets accept only branded measurements for the same scenario", async ({
  page,
}, testInfo: TestInfo) => {
  await page.setContent('<div id="performance-outcome">before</div>');
  const config = {
    rendererStrategy: "none",
    rendererWorkload: "none",
    scenarios: [
      {
        automated: true,
        automatedTestName: "perf: runtime brand",
        browser: true,
        browserTestName: "browser perf: runtime brand",
        budget: { maxInteractionMs: 1_000 },
        expectedObservable: "The measured action completes.",
        fixture: "runtime fixture",
        id: "runtime-brand",
        interaction: "control-change",
        workload: false,
      },
    ],
    usesCustomRenderer: false,
    workloadTargets: [],
  } as const;
  const attachmentCount = testInfo.attachments.length;
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await page.locator("#performance-outcome").evaluate((node) => {
        node.textContent = "after";
      });
    },
    {
      observeOutcome: () => page.locator("#performance-outcome").textContent(),
      scenarioId: "runtime-brand",
    },
  );
  await expectToolcraftScenarioPerformanceBudget(result, config, "runtime-brand");

  expect(
    testInfo.attachments.slice(attachmentCount).map((attachment) =>
      parseToolcraftBrowserRuntimeEvidence(attachment)?.evidenceType,
    ),
  ).toEqual([
    "performance-product-outcome",
    "performance-measurement",
    "performance-budget",
  ]);
  expect(Object.isFrozen(result)).toBe(true);
  await expect(
    expectToolcraftScenarioPerformanceBudget(
      { ...result },
      config,
      "runtime-brand",
    ),
  ).rejects.toThrow(/protected measurement helper/u);
});

test("protected observable evidence is attached only after its assertion succeeds", async ({
  page,
}, testInfo: TestInfo) => {
  await page.goto("/");
  const session = await createToolcraftBrowserProofSession(page);
  await page.locator('[data-slot="toolcraft-runtime-app"]').evaluate((root) => {
    const output = document.createElement("div");
    output.dataset.toolcraftProductOutput = "";
    output.textContent = "Before";
    const button = document.createElement("button");
    button.id = "change-output";
    button.type = "button";
    button.textContent = "Change output";
    const controlBoundary = document.createElement("div");
    controlBoundary.className = "contents";
    controlBoundary.dataset.toolcraftControlTarget = "test.output";
    const field = document.createElement("div");
    field.dataset.slot = "field";
    field.append(button);
    controlBoundary.append(field);
    root.append(output, controlBoundary);
  });

  const attachmentCount = testInfo.attachments.length;
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("test.output", async (control, currentPage) => {
      await control.locator("#change-output").evaluate((button) => {
        button.dataset.activated = "true";
      });
      await currentPage.locator('[data-toolcraft-product-output]').evaluate((output) => {
        output.textContent = "After";
      });
    }),
    { requirementId: "test.successful-observable" },
  );

  const attachment = testInfo.attachments.at(-1);
  expect(testInfo.attachments).toHaveLength(attachmentCount + 1);
  expect(attachment).toMatchObject({
    contentType: TOOLCRAFT_BROWSER_RUNTIME_EVIDENCE_CONTENT_TYPE,
    name: TOOLCRAFT_BROWSER_RUNTIME_EVIDENCE_ATTACHMENT_NAME,
  });
  expect(parseToolcraftBrowserRuntimeEvidence(attachment)).toEqual({
    evidenceType: "product-observable-change",
    requirementId: "test.successful-observable",
    target: "test.output",
    version: 2,
  });

  const countAfterSuccess = testInfo.attachments.length;
  await expect(
    expectToolcraftProductObservableToChange(
      session,
      session.controlAction("test.output", async () => undefined),
      {
        requirementId: "test.failed-observable",
        timeoutMs: 100,
      },
    ),
  ).rejects.toThrow(/Product output should change/);
  expect(testInfo.attachments).toHaveLength(countAfterSuccess);
});

test("acceptance evidence is attached only after semantic verification succeeds", async ({
  page,
}, testInfo: TestInfo) => {
  await page.goto("/");
  const session = await createToolcraftBrowserProofSession(page);
  await page.locator('[data-slot="toolcraft-runtime-app"]').evaluate((root) => {
    root.setAttribute(
      "data-duration",
      JSON.stringify({
        renderedCycleDurationSeconds: 8,
        timelineDurationSeconds: 8,
      }),
    );
    root.setAttribute(
      "data-selection",
      JSON.stringify({ selectedLayerId: "layer-a" }),
    );
    const outcome = document.createElement("div");
    outcome.id = "outcome";
    outcome.textContent = "before";
    root.append(outcome);
  });
  const attachmentCount = testInfo.attachments.length;
  const duration = session.observe((root) =>
    JSON.parse(root.getAttribute("data-duration") ?? "null"),
  );

  await expectToolcraftTimelineDuration(
    duration,
    session.action(async (currentPage) => {
      await currentPage.locator('[data-slot="toolcraft-runtime-app"]').evaluate((root) => {
        root.setAttribute(
          "data-duration",
          JSON.stringify({
            renderedCycleDurationSeconds: 6,
            timelineDurationSeconds: 6,
          }),
        );
      });
    }),
    6,
    { requirementId: "timeline.playback", stabilityIntervalMs: 0 },
  );

  expect(parseToolcraftBrowserRuntimeEvidence(testInfo.attachments.at(-1))).toEqual({
    evidenceType: "timeline-duration",
    requirementId: "timeline.playback",
    version: 2,
  });
  expect(testInfo.attachments).toHaveLength(attachmentCount + 1);

  const selection = session.observe((root) =>
    JSON.parse(root.getAttribute("data-selection") ?? "null"),
  );
  await expect(
    expectToolcraftLayerSelection(
      selection,
      session.action(async () => undefined),
      { selectedLayerId: "layer-b" },
      {
        requirementId: "layers.selection",
        stabilityIntervalMs: 0,
        timeoutMs: 100,
      },
    ),
  ).rejects.toThrow(/select the expected layer/);
  expect(testInfo.attachments).toHaveLength(attachmentCount + 1);

  let transientActionStarted = false;
  let transientObservationCount = 0;
  await expect(
    expectToolcraftAcceptanceOutcome(
      async () => {
        if (!transientActionStarted) {
          return "before";
        }
        transientObservationCount += 1;
        return transientObservationCount === 1 ? "transient" : "before";
      },
      async () => {
        transientActionStarted = true;
      },
      {
        evidenceType: "command-side-effect",
        requirementId: "command.transient",
      },
    ),
  ).rejects.toThrow(/stability window/);
  expect(testInfo.attachments).toHaveLength(attachmentCount + 1);

  await page.locator("#outcome").evaluate((node) => {
    node.textContent = "after";
  });
  await expectToolcraftReferenceParity(
    () => page.locator("#outcome").textContent(),
    "after",
    { requirementId: "reference.renderer-state" },
  );
  expect(testInfo.attachments).toHaveLength(attachmentCount + 2);
});
