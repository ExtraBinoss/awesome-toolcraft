import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";

describe("starter acceptance custom control coverage contract", () => {
  it("requires custom controls to explain why they are custom and prove minimal runtime UI", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                glyphRamp: {
                  defaultValue: [],
                  label: "Glyph ramp",
                  orderRole: "input",
                  target: "glyph.ramp",
                  type: "glyphRamp",
                } as never,
              },
              title: "Glyphs",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schema,
        acceptance: [
          {
            automated: true,
            automatedTestName: "glyph ramp changes output",
            browser: true,
            browserTestName: "browser: glyph ramp changes output",
            componentType: "glyphRamp",
            evidence: "product-output",
            expectedObservable: "Choosing and ordering glyphs changes the rendered product output.",
            fixture: "glyph ramp fixture",
            id: "glyph.ramp",
            kind: "control",
            target: "glyph.ramp",
            userAction: "Upload, reorder, and remove glyphs.",
          },
        ],
      }),
    ).toContain(
      "Glyphs / glyphRamp (glyph.ramp) is a custom control and must declare customControlCoverage for: built-in-gap, kit-primitives, minimal-ui, product-output, runtime-state.",
    );
  });

  it("requires custom controls to include a built-in fit check", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                glyphRamp: {
                  defaultValue: [],
                  label: "Glyph ramp",
                  orderRole: "input",
                  target: "glyph.ramp",
                  type: "glyphRamp",
                } as never,
              },
              title: "Glyphs",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schema,
        acceptance: [
          {
            automated: true,
            automatedTestName: "glyph ramp changes output",
            browser: true,
            browserTestName: "browser: glyph ramp changes output",
            componentType: "glyphRamp",
            customControlCoverage: [
              "built-in-gap",
              "kit-primitives",
              "minimal-ui",
              "product-output",
              "runtime-state",
            ],
            evidence: "product-output",
            expectedObservable: "Choosing and ordering glyphs changes the rendered product output.",
            fixture: "glyph ramp fixture",
            id: "glyph.ramp",
            kind: "control",
            target: "glyph.ramp",
            userAction: "Upload, reorder, and remove glyphs.",
          },
        ],
      }),
    ).toContain(
      "Glyphs / glyphRamp (glyph.ramp) is a custom control and must declare builtInFitCheck with checkedBuiltIns, closestBuiltIn, whyInsufficient, and productObservable.",
    );
  });
});
