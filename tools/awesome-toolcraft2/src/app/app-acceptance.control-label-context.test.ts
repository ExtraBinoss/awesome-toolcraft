import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("starter acceptance control label context contract", () => {
  it("accepts concise property labels when the section clearly names the entity", () => {
    const schemaWithSemanticLabelContext = defineToolcraft({
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
                  target: "motion.speed",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Animation",
            },
          ],
          title: "Motion",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithSemanticLabelContext,
        acceptance: [makeControlAcceptance("motion.speed", "slider")],
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
            reason: "The motion speed is a decorative self-running effect and does not expose product time transport.",
          },
          mode: "new-toolcraft-app",
        },
      }),
    ).toEqual([]);
  });

  it("rejects generic control labels in weak contexts with semantic suggestions", () => {
    const schemaWithWeakControlLabels = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                amount: {
                  defaultValue: 0.5,
                  label: "Amount",
                  max: 1,
                  min: 0,
                  orderRole: "strength",
                  target: "shader.amount",
                  type: "slider",
                  variant: "continuous",
                },
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  orderRole: "color",
                  target: "pattern.color",
                  type: "color",
                },
                scale: {
                  defaultValue: 1,
                  label: "Scale",
                  max: 2,
                  min: 0.5,
                  orderRole: "strength",
                  target: "pattern.symbolScale",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Settings",
            },
          ],
          title: "Pattern",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithWeakControlLabels,
        acceptance: [
          makeControlAcceptance("shader.amount", "slider"),
          makeControlAcceptance("pattern.color", "color"),
          makeControlAcceptance("pattern.symbolScale", "slider"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Settings / amount label "Amount" is too generic in this context. Short labels are allowed when the nearest visible section or group clearly names the affected product entity. Rename it to "Shader amount".',
        'Settings / color label "Color" is too generic in this context. Short labels are allowed when the nearest visible section or group clearly names the affected product entity. Rename it to "Pattern color".',
        'Settings / scale label "Scale" is too generic in this context. Short labels are allowed when the nearest visible section or group clearly names the affected product entity. Rename it to "Symbol Scale".',
      ]),
    );
  });

  it("rejects generic labels in mixed visual bucket sections", () => {
    const schemaWithMixedStyleControls = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                backgroundOpacity: {
                  defaultValue: 0.9,
                  label: "Background opacity",
                  max: 1,
                  min: 0,
                  orderRole: "strength",
                  target: "background.opacity",
                  type: "slider",
                  variant: "continuous",
                },
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  orderRole: "color",
                  target: "pattern.color",
                  type: "color",
                },
              },
              title: "Style",
            },
          ],
          title: "Pattern",
        },
      },
    });
    const errors = validateContractAcceptance({
      schema: schemaWithMixedStyleControls,
      acceptance: [
        makeControlAcceptance("background.opacity", "slider"),
        makeControlAcceptance("pattern.color", "color"),
      ],
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'Style / color label "Color" is too generic in this context. Short labels are allowed when the nearest visible section or group clearly names the affected product entity. Rename it to "Pattern color".',
      ]),
    );
    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('backgroundOpacity label "Background opacity"'),
      ]),
    );
  });
});
