import { describe, expect, it } from "vitest";
import {
  defineToolcraft,
  type ResolvedToolcraftAppSchema,
} from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("starter acceptance section title contract", () => {
  it("rejects generic and control-type section titles", () => {
    const schemaWithWeakSectionTitles = defineToolcraft({
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
              },
              title: "Settings",
            },
            {
              controls: {
                grain: {
                  defaultValue: 0.1,
                  label: "Grain",
                  max: 1,
                  min: 0,
                  orderRole: "detail",
                  target: "shader.grain",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Sliders",
            },
          ],
          title: "Shader",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithWeakSectionTitles,
        acceptance: [
          makeControlAcceptance("shader.amount", "slider"),
          makeControlAcceptance("shader.grain", "slider"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "Settings is too generic for a controls section. Name the product entity, workflow stage, or behavior it edits instead of using a bucket title.",
        "Sliders names a UI control type instead of the product entity. Group controls by product meaning, not by Slider, Color, Input, Button, or similar component type.",
      ]),
    );
  });

  it("rejects visible controls sections without titles", () => {
    const schema = defineToolcraft({
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
              },
              title: "Shader",
            },
          ],
          title: "Shader",
        },
      },
    });
    const schemaWithMissingTitle: ResolvedToolcraftAppSchema = {
      ...schema,
      panels: {
        ...schema.panels,
        controls: schema.panels.controls
          ? {
              ...schema.panels.controls,
              sections: schema.panels.controls.sections.map((section) =>
                section.title === "Shader" ? { ...section, title: undefined } : section,
              ),
            }
          : schema.panels.controls,
      },
    };

    expect(
      validateContractAcceptance({
        schema: schemaWithMissingTitle,
        acceptance: [
          makeControlAcceptance("shader.amount", "slider"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "untitled section 2 is missing a controls section title. Every visible controls-panel section must name the product entity, workflow stage, or behavior it edits.",
      ]),
    );
  });

  it("rejects duplicate section titles", () => {
    const schemaWithDuplicateSections = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                count: {
                  defaultValue: 10,
                  label: "Count",
                  max: 50,
                  min: 1,
                  orderRole: "detail",
                  target: "shape.primary.count",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Shape",
            },
            {
              controls: {
                radius: {
                  defaultValue: 8,
                  label: "Radius",
                  max: 40,
                  min: 0,
                  orderRole: "spatial",
                  target: "shape.secondary.radius",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Shape",
            },
          ],
          title: "Master Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithDuplicateSections,
        acceptance: [
          makeControlAcceptance("shape.primary.count", "slider"),
          makeControlAcceptance("shape.secondary.radius", "slider"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Controls panel repeats the section title "Shape" 2 times. Section titles must be unique and describe distinct product entities or workflow stages.',
      ]),
    );
  });
});
