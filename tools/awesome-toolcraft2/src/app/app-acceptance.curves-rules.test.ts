import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("starter acceptance curves control rules", () => {
  it("accepts single curves with points coverage only", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                easing: {
                  defaultValue: {
                    activeChannel: "RGB",
                    points: {
                      RGB: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                    },
                  },
                  curveIntent: "single-value-map",
                  label: "Easing",
                  target: "animation.easing",
                  type: "curves",
                  variant: "single",
                },
              },
              title: "Motion",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateContractAcceptance({
      schema: schema,
      acceptance: [
        {
          automated: true,
          automatedTestName: "easing curve changes motion output",
          browser: true,
          browserTestName: "browser: easing curve changes motion output",
          componentType: "curves",
          controlPartCoverage: ["curves.points"],
          evidence: "product-output",
          expectedObservable: "Changing Easing curve points changes animation timing.",
          fixture: "motion fixture",
          id: "animation.easing",
          kind: "control",
          target: "animation.easing",
          userAction: "Drag an Easing curve point.",
        },
      ],
    });

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("curves.activeChannel"),
      ]),
    );
  });

  it("requires typed one-dimensional curves to use the single variant", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                bendCurve: {
                  defaultValue: {
                    activeChannel: "RGB",
                    points: {
                      B: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                      G: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                      R: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                      RGB: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                    },
                  },
                  curveIntent: "single-value-map",
                  label: "Curva",
                  target: "shape.bendCurve",
                  type: "curves",
                },
              },
              title: "Shape",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateContractAcceptance({
      schema: schema,
      acceptance: [
        {
          automated: true,
          automatedTestName: "bend curve changes geometry output",
          browser: true,
          browserTestName: "browser: bend curve changes geometry output",
          componentType: "curves",
          controlPartCoverage: ["curves.activeChannel", "curves.points"],
          evidence: "product-output",
          expectedObservable: "Changing Bend curve points changes the rendered shape bend.",
          fixture: "shape fixture",
          id: "shape.bendCurve",
          kind: "control",
          target: "shape.bendCurve",
          userAction: "Drag a Bend curve point.",
        },
      ],
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'Shape / bendCurve (shape.bendCurve) is a semantic single curve and must set variant: "single"; RGB/R/G/B curve tabs are reserved for color-correction or channel-specific curves.',
      ]),
    );
  });

  it("requires every curve to declare language-independent intent", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                response: {
                  defaultValue: {
                    activeChannel: "RGB",
                    points: {
                      RGB: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                    },
                  },
                  label: "Respuesta",
                  target: "motion.response",
                  type: "curves",
                  variant: "single",
                },
              },
              title: "Movimiento",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema,
        acceptance: [
          makeControlAcceptance("motion.response", "curves"),
        ],
      }),
    ).toContain(
      'Movimiento / response (motion.response) must declare curveIntent "single-value-map" or "color-channels" so the curve composition does not depend on its label.',
    );
  });
});
