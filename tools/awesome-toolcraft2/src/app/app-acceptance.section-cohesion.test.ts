import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import {
  validateContractAcceptance,
  validateContractAcceptanceDiagnostics,
} from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("starter acceptance section cohesion contract", () => {
  it("rejects overgrown broad sections that mix semantic control clusters", () => {
    const schemaWithOvergrownFlowSection = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                mode: {
                  defaultValue: "columns",
                  label: "Mode",
                  options: [
                    { label: "Columns", value: "columns" },
                    { label: "Burst", value: "burst" },
                  ],
                  orderRole: "mode",
                  semanticGroup: "motion",
                  target: "flow.mode",
                  type: "select",
                },
                speed: {
                  defaultValue: 1,
                  label: "Speed",
                  max: 3,
                  min: 0,
                  orderRole: "strength",
                  semanticGroup: "motion",
                  target: "flow.speed",
                  type: "slider",
                  variant: "continuous",
                },
                duration: {
                  defaultValue: 8,
                  label: "Duration",
                  max: 20,
                  min: 1,
                  orderRole: "detail",
                  semanticGroup: "motion",
                  target: "flow.duration",
                  type: "slider",
                  variant: "continuous",
                },
                width: {
                  defaultValue: 80,
                  label: "Width",
                  max: 200,
                  min: 20,
                  orderRole: "spatial",
                  semanticGroup: "geometry",
                  target: "flow.width",
                  type: "slider",
                  variant: "continuous",
                },
                curve: {
                  defaultValue: 0.5,
                  label: "Curve",
                  max: 1,
                  min: 0,
                  orderRole: "spatial",
                  semanticGroup: "geometry",
                  target: "flow.curve",
                  type: "slider",
                  variant: "continuous",
                },
                fill: {
                  defaultValue: 60,
                  label: "Fill",
                  max: 100,
                  min: 0,
                  orderRole: "strength",
                  semanticGroup: "appearance",
                  target: "flow.fill",
                  type: "slider",
                  unit: "%",
                  variant: "continuous",
                },
                wordCount: {
                  defaultValue: 24,
                  label: "Words",
                  max: 100,
                  min: 1,
                  orderRole: "detail",
                  semanticGroup: "content",
                  target: "flow.wordCount",
                  type: "slider",
                  variant: "continuous",
                },
                text: {
                  commitMode: "content",
                  defaultValue: "Creative app",
                  label: "Text",
                  orderRole: "input",
                  semanticGroup: "content",
                  target: "flow.text",
                  textValueKind: "single-line",
                  type: "text",
                },
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  orderRole: "color",
                  semanticGroup: "appearance",
                  target: "flow.color",
                  type: "color",
                },
                exportQuality: {
                  defaultValue: "high",
                  label: "Quality",
                  options: [
                    { label: "High", value: "high" },
                    { label: "Low", value: "low" },
                  ],
                  orderRole: "detail",
                  semanticGroup: "export",
                  target: "flow.exportQuality",
                  type: "select",
                },
              },
              title: "Flow",
            },
          ],
          title: "Master Controls",
        },
      },
    });

    const diagnostics = validateContractAcceptanceDiagnostics({
      schema: schemaWithOvergrownFlowSection,
      acceptance: [
        makeControlAcceptance("flow.mode", "select"),
        makeControlAcceptance("flow.speed", "slider"),
        makeControlAcceptance("flow.duration", "slider"),
        makeControlAcceptance("flow.width", "slider"),
        makeControlAcceptance("flow.curve", "slider"),
        makeControlAcceptance("flow.fill", "slider"),
        makeControlAcceptance("flow.wordCount", "slider"),
        makeControlAcceptance("flow.text", "text"),
        makeControlAcceptance("flow.color", "color"),
        makeControlAcceptance("flow.exportQuality", "select"),
      ],
      transferMode: {
        animationIntent: {
          behaviorCoverage: [
            "no-user-facing-transport",
            "no-play-pause",
            "no-scrub",
            "no-duration-control",
            "no-loop-control",
            "no-export-at-time",
          ],
          mode: "autonomous",
          reason: "The flow speed is a decorative self-running effect and does not expose product time transport.",
        },
        mode: "new-toolcraft-app",
      },
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining(
            "Flow has 10 controls across multiple semantic clusters",
          ),
          ruleId: "controls-layout-heuristics",
          severity: "warning",
        }),
      ]),
    );
  });

  it("accepts a small cohesive broad section when controls share one product meaning", () => {
    const schemaWithSmallFlowSection = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                speed: {
                  defaultValue: 1,
                  label: "Speed",
                  max: 3,
                  min: 0,
                  orderRole: "strength",
                  target: "flow.speed",
                  type: "slider",
                  variant: "continuous",
                },
                drift: {
                  defaultValue: 0.4,
                  label: "Drift",
                  max: 1,
                  min: 0,
                  orderRole: "detail",
                  target: "flow.drift",
                  type: "slider",
                  variant: "continuous",
                },
                phase: {
                  defaultValue: 0.25,
                  label: "Phase",
                  max: 1,
                  min: 0,
                  orderRole: "detail",
                  target: "flow.phase",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Flow",
            },
          ],
          title: "Master Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithSmallFlowSection,
        acceptance: [
          makeControlAcceptance("flow.speed", "slider"),
          makeControlAcceptance("flow.drift", "slider"),
          makeControlAcceptance("flow.phase", "slider"),
        ],
        transferMode: {
          animationIntent: {
            behaviorCoverage: [
              "no-user-facing-transport",
              "no-play-pause",
              "no-scrub",
              "no-duration-control",
              "no-loop-control",
              "no-export-at-time",
            ],
            mode: "autonomous",
            reason: "The flow speed is a decorative self-running effect and does not expose product time transport.",
          },
          mode: "new-toolcraft-app",
        },
      }),
    ).toEqual([]);
  });

  it("rejects splitting one product entity into an object section and a color section", () => {
    const schemaWithSplitEntityColor = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                connections: {
                  defaultValue: "10",
                  label: "Connections",
                  orderRole: "primary",
                  target: "squares.right.connections",
                  textValueKind: "single-line",
                  type: "text",
                },
                hoverRadius: {
                  defaultValue: 200,
                  label: "Hover radius",
                  max: 400,
                  min: 0,
                  orderRole: "detail",
                  target: "squares.right.hoverRadius",
                  type: "slider",
                  unit: "px",
                  variant: "continuous",
                },
              },
              title: "Square 1 (Right)",
            },
            {
              controls: {
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  orderRole: "color",
                  target: "squares.right.color",
                  type: "color",
                },
              },
              title: "Color",
            },
          ],
          title: "Pattern",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithSplitEntityColor,
        acceptance: [
          makeControlAcceptance("squares.right.connections", "text"),
          makeControlAcceptance("squares.right.hoverRadius", "slider"),
          makeControlAcceptance("squares.right.color", "color"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Controls for product entity "squares.right" are split across sections: Square 1 (Right), Appearance. Keep controls for the same product entity in one semantic section unless the Control Section Inventory declares workflowStage and splitReason for every split section.',
      ]),
    );
  });

  it("accepts color grouped inside the same semantic product entity section", () => {
    const schemaWithGroupedEntityColor = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                connections: {
                  defaultValue: "10",
                  label: "Connections",
                  orderRole: "primary",
                  target: "squares.right.connections",
                  textValueKind: "single-line",
                  type: "text",
                },
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  orderRole: "color",
                  target: "squares.right.color",
                  type: "color",
                },
                hoverRadius: {
                  defaultValue: 200,
                  label: "Hover radius",
                  max: 400,
                  min: 0,
                  orderRole: "detail",
                  target: "squares.right.hoverRadius",
                  type: "slider",
                  unit: "px",
                  variant: "continuous",
                },
              },
              title: "Square 1 (Right)",
            },
          ],
          title: "Pattern",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithGroupedEntityColor,
        acceptance: [
          makeControlAcceptance("squares.right.connections", "text"),
          makeControlAcceptance("squares.right.color", "color"),
          makeControlAcceptance("squares.right.hoverRadius", "slider"),
        ],
      }),
    ).toEqual([]);
  });
});
