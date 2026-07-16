import { expect, test } from "@playwright/test";
import type { ToolcraftPerformanceConfig } from "@/toolcraft/runtime";

import { parseToolcraftBrowserRuntimeEvidence } from "../src/app/test-evidence/browser-runtime-contract";
import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import {
  dragToolcraftSliderToPerformanceStressValue,
  expectToolcraftSegmentedControlCellsPreservePadding,
  getToolcraftFieldByLabel,
} from "./performance-helpers";

test("segmented layout helper catches paddingless or colliding cells", async ({ page }) => {
  await page.setContent(`
    <div data-slot="field">FX Preset
      <div data-slot="toggle-group" style="display:flex;width:360px;">
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:120px;padding:0 12px;">One</button>
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:120px;padding:0 12px;">Two</button>
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:120px;padding:0 12px;">Off</button>
      </div>
    </div>
  `);

  await expectToolcraftSegmentedControlCellsPreservePadding(page, "FX Preset");

  await page.setContent(`
    <div data-slot="field">FX Preset
      <div data-slot="toggle-group" style="display:flex;width:180px;">
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:60px;padding:0;">Full Stack</button>
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:60px;padding:0;">RGB Split</button>
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:60px;padding:0;">Lines</button>
      </div>
    </div>
  `);

  await expect(
    expectToolcraftSegmentedControlCellsPreservePadding(page, "FX Preset"),
  ).rejects.toThrow(/must preserve cell padding/);
});

test("performance helpers match control labels literally", async ({ page }) => {
  await page.setContent(`
    <div data-slot="field" data-testid="literal-label">Size (px)<input type="range" /></div>
    <div data-slot="field" data-testid="regex-lookalike">Size px<input type="range" /></div>
  `);

  await expect(await getToolcraftFieldByLabel(page, "Size (px)")).toHaveAttribute(
    "data-testid",
    "literal-label",
  );
});

test("slider stress helper applies the declared value and emits runtime evidence", async ({
  page,
}, testInfo) => {
  await page.setContent(`
    <div data-slot="toolcraft-runtime-app">
      <div class="contents" data-toolcraft-control-target="density.value">
        <div data-slot="field">Density
          <input data-slot="slider" role="slider" type="range" min="0" max="10" value="0" style="width:200px;height:20px;" />
        </div>
      </div>
    </div>
  `);
  const config = {
    rendererStrategy: "none",
    rendererWorkload: "none",
    scenarios: [{
      automated: true,
      automatedTestName: "perf: density stress",
      browser: true,
      browserTestName: "browser perf: density stress",
      budget: { maxInteractionMs: 500 },
      expectedObservable: "Density drag completes.",
      fixture: "Density stress fixture.",
      id: "density-stress",
      interaction: "control-drag",
      stressFixture: { kind: "max-value", reason: "Maximum density.", value: 9 },
      target: "density.value",
      workload: true,
    }],
    usesCustomRenderer: false,
    workloadTargets: ["density.value"],
  } as const satisfies ToolcraftPerformanceConfig;

  await dragToolcraftSliderToPerformanceStressValue(
    page,
    "Density",
    config,
    "density-stress",
  );

  expect(
    testInfo.attachments.map((attachment) =>
      parseToolcraftBrowserRuntimeEvidence(attachment)?.evidenceType,
    ),
  ).toEqual(expect.arrayContaining([
    "performance-control-drag",
    "performance-stress-fixture",
  ]));
});

test("export acceptance rejects a verifier that does not return an artifact observation", async () => {
  await expect(
    expectToolcraftExportedArtifact(
      async () => new Uint8Array([1, 2, 3]),
      async () => ({}),
      { requirementId: "image-export-artifact" },
    ),
  ).rejects.toThrow(/artifact inspection/i);

  await expect(
    expectToolcraftExportedArtifact(
      async () => undefined,
      async () => ({ byteLength: 1 }),
      { requirementId: "missing-export-artifact" },
    ),
  ).rejects.toThrow(/non-empty export artifact/i);
});
