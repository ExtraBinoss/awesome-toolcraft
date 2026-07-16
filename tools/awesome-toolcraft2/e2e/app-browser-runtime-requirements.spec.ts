import { expect, test } from "@playwright/test";
import { defineToolcraft } from "@/toolcraft/runtime";

import { appAcceptance } from "../src/app/app-acceptance";
import { appPerformance } from "../src/app/app-performance";
import {
  deriveToolcraftBrowserRuntimeRequirements,
  deriveToolcraftPerformanceRuntimeRequirements,
} from "./browser-runtime-evidence-requirements";

test("runtime evidence requirements are derived from browser acceptance IDs", () => {
  const requirements = deriveToolcraftBrowserRuntimeRequirements(appAcceptance);

  for (const entry of appAcceptance.filter((item) => item.browser)) {
    expect(
      requirements.some(
        (requirement) =>
          requirement.requirementId === entry.id &&
          requirement.testName === entry.browserTestName,
      ),
      `Browser acceptance row "${entry.id}" should derive runtime evidence.`,
    ).toBe(true);
  }
});

test("performance evidence requirements are derived from typed scenarios", () => {
  const requirements = deriveToolcraftPerformanceRuntimeRequirements(
    appPerformance.scenarios,
  );
  expect(requirements.every((requirement) => requirement.requirementId)).toBe(true);
  for (const scenario of appPerformance.scenarios.filter(
    (entry) => entry.browser,
  )) {
    const scenarioEvidence = requirements
      .filter((requirement) => requirement.requirementId === scenario.id)
      .map((requirement) => requirement.evidenceType);
    expect(scenarioEvidence).toContain("performance-measurement");
    expect(scenarioEvidence).toContain("performance-budget");
    expect(
      requirements
        .filter((requirement) => requirement.requirementId === scenario.id)
        .every((requirement) => requirement.target === scenario.target),
    ).toBe(true);
  }
});

test("render scale and heavy scenarios derive runtime fixture evidence", () => {
  expect(
    deriveToolcraftPerformanceRuntimeRequirements([
      {
        automated: true,
        automatedTestName: "perf: retina workload",
        browser: true,
        browserTestName: "browser perf: retina workload",
        budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
        expectedObservable: "The retina workload stays responsive.",
        fixture: "Retina workload fixture.",
        id: "retina-workload",
        interaction: "control-drag",
        stressFixture: { value: { "canvas.renderScale": 2 } },
        workload: true,
        workloadFixture: { value: { itemCount: 1000 } },
      },
    ]).map((requirement) => requirement.evidenceType),
  ).toEqual([
    "performance-measurement",
    "performance-budget",
    "performance-product-outcome",
    "performance-stress-fixture",
    "performance-workload-fixture",
    "performance-control-drag",
    "performance-render-scale",
  ]);
});

test("control schema derives segmented and discrete runtime evidence", () => {
  const acceptance = [
    {
      browser: true,
      browserTestName: "browser: mode layout",
      evidence: "product-output",
      id: "mode.layout",
      target: "mode.value",
    },
    {
      browser: true,
      browserTestName: "browser: density layout",
      evidence: "product-output",
      id: "density.layout",
      target: "density.value",
    },
  ];
  const schema = {
    canvas: { enabled: true },
    panels: {
      controls: {
        sections: [
          {
            controls: {
              density: {
                defaultValue: 2,
                label: "Density",
                max: 4,
                min: 1,
                step: 1,
                target: "density.value",
                type: "slider",
                variant: "discrete",
              },
              mode: {
                defaultValue: "one",
                label: "Mode",
                options: [
                  { label: "One", value: "one" },
                  { label: "Two", value: "two" },
                ],
                target: "mode.value",
                type: "segmented",
              },
            },
            title: "Behavior",
          },
        ],
        title: "Controls",
      },
    },
  } as const;

  expect(
    deriveToolcraftBrowserRuntimeRequirements(
      acceptance,
      defineToolcraft(schema),
    ).map(({ evidenceType, requirementId, target }) => ({
      evidenceType,
      requirementId,
      target,
    })),
  ).toEqual(
    expect.arrayContaining([
      {
        evidenceType: "segmented-control-layout",
        requirementId: "mode.layout",
        target: "mode.value",
      },
      {
        evidenceType: "discrete-slider-layout",
        requirementId: "density.layout",
        target: "density.value",
      },
    ]),
  );
});

test("typed visibility and background coverage derive dedicated semantic evidence", () => {
  const schema = defineToolcraft({
    canvas: { enabled: true },
    panels: {
      controls: {
        sections: [
          {
            controls: {
              conditional: {
                defaultValue: 1,
                label: "Conditional",
                target: "feature.conditional",
                type: "slider",
                visibleWhen: { equals: true, target: "feature.enabled" },
              },
              enabled: {
                defaultValue: false,
                label: "Enabled",
                target: "feature.enabled",
                type: "switch",
              },
              includeBackground: {
                defaultValue: true,
                label: "Include",
                target: "export.includeBackground",
                type: "switch",
              },
              outputActions: {
                actions: [
                  {
                    label: "Export Video",
                    role: "export-video",
                    value: "export.video",
                  },
                ],
                target: "actions.output",
                type: "panelActions",
              },
            },
            title: "Output",
          },
        ],
        title: "Controls",
      },
    },
  });
  const requirements = deriveToolcraftBrowserRuntimeRequirements(
    [
      {
        browser: true,
        browserTestName: "browser: conditional visibility",
        evidence: "product-output",
        id: "feature.conditional",
        target: "feature.conditional",
        visibilityCoverage: ["hidden", "visible"],
      },
      {
        backgroundOutputCoverage: [
          "preview-hidden-when-excluded",
          "image-transparent-when-excluded",
          "video-background-preserved",
        ],
        browser: true,
        browserTestName: "browser: background output",
        evidence: "rendered-pixels",
        id: "export.includeBackground",
        target: "export.includeBackground",
      },
    ],
    schema,
  );

  expect(
    requirements
      .filter((requirement) => requirement.requirementId === "feature.conditional")
      .map((requirement) => requirement.evidenceType),
  ).toEqual(
    expect.arrayContaining([
      "conditional-control-hidden",
      "conditional-control-visible",
    ]),
  );
  expect(
    requirements
      .filter((requirement) => requirement.requirementId === "export.includeBackground")
      .map((requirement) => requirement.evidenceType),
  ).toEqual(
    expect.arrayContaining([
      "background-image-transparency",
      "background-preview-exclusion",
      "background-video-preserved",
    ]),
  );
});

test("all-required background coverage derives video evidence only for video products", () => {
  const makeSchema = (withVideo: boolean) =>
    defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                includeBackground: {
                  defaultValue: true,
                  label: "Include",
                  target: "export.includeBackground",
                  type: "switch",
                },
                outputActions: {
                  actions: [
                    { label: "Export PNG", role: "export-image", value: "export.png" },
                    ...(withVideo
                      ? [
                          {
                            label: "Export Video",
                            role: "export-video" as const,
                            value: "export.video",
                          },
                        ]
                      : []),
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Output",
            },
          ],
          title: "Controls",
        },
      },
    });
  const acceptance = [
    {
      backgroundOutputCoverage: "all-required-background-output" as const,
      browser: true,
      browserTestName: "browser: background output",
      evidence: "rendered-pixels" as const,
      id: "export.includeBackground",
      target: "export.includeBackground",
    },
  ];

  const imageEvidence = deriveToolcraftBrowserRuntimeRequirements(
    acceptance,
    makeSchema(false),
  ).map((requirement) => requirement.evidenceType);
  const videoEvidence = deriveToolcraftBrowserRuntimeRequirements(
    acceptance,
    makeSchema(true),
  ).map((requirement) => requirement.evidenceType);

  expect(imageEvidence).not.toContain("background-video-preserved");
  expect(videoEvidence).toContain("background-video-preserved");
});
