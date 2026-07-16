import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("starter acceptance control state contract", () => {
  it("rejects disabled product controls and requires visibleWhen for unavailable controls", () => {
    const schemaWithDisabledDependency = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fillMode: {
                  defaultValue: "full",
                  label: "Fill mode",
                  options: [
                    { label: "Full", value: "full" },
                    { label: "Partial", value: "partial" },
                  ],
                  target: "distribution.fillMode",
                  type: "segmented",
                },
                fillAmount: {
                  defaultValue: 50,
                  disabledWhen: {
                    equals: "full",
                    target: "distribution.mode",
                  },
                  label: "Fill level",
                  max: 100,
                  min: 0,
                  target: "distribution.fillAmount",
                  type: "slider",
                },
              },
              title: "Distribution",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithDisabledDependency,
        acceptance: [
          makeControlAcceptance("distribution.fillMode", "segmented"),
          makeControlAcceptance("distribution.fillAmount", "slider"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "disabledWhen target distribution.mode does not match another schema control target",
        ),
        expect.stringContaining(
          "uses disabledWhen. Generated product panels should show only controls usable in the current state",
        ),
      ]),
    );

    const schemaWithBranchDisabledDependency = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fillMode: {
                  defaultValue: "full",
                  label: "Fill mode",
                  options: [
                    { label: "Full", value: "full" },
                    { label: "Partial", value: "partial" },
                  ],
                  target: "distribution.fillMode",
                  type: "segmented",
                },
                fillAmount: {
                  defaultValue: 50,
                  disabledWhen: {
                    equals: "full",
                    target: "distribution.fillMode",
                  },
                  label: "Fill level",
                  max: 100,
                  min: 0,
                  target: "distribution.fillAmount",
                  type: "slider",
                },
              },
              title: "Distribution",
            },
          ],
          title: "Controls",
        },
      },
    });
    const branchErrors = validateContractAcceptance({
      schema: schemaWithBranchDisabledDependency,
      acceptance: [
        makeControlAcceptance("distribution.fillMode", "segmented"),
        {
          ...makeControlAcceptance("distribution.fillAmount", "slider"),
          expectedObservable: "Fill level changes partial fill output and becomes disabled when Fill mode is Full.",
          userAction: "Switch Fill mode to Full, verify Fill level is disabled, then switch to Partial and drag it.",
        },
      ],
    });

    expect(branchErrors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "uses disabledWhen. Generated product panels should show only controls usable in the current state",
        ),
      ]),
    );

    const schemaWithDisabledControl = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fillAmount: {
                  defaultValue: 50,
                  disabled: true,
                  label: "Fill level",
                  max: 100,
                  min: 0,
                  target: "distribution.fillAmount",
                  type: "slider",
                },
              },
              title: "Distribution",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithDisabledControl,
        acceptance: [
          makeControlAcceptance("distribution.fillAmount", "slider"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "sets disabled: true. Generated product panels should show only controls usable in the current state",
        ),
      ]),
    );
  });

  it("requires visibleWhen controls to reference a real target and prove hidden behavior", () => {
    const schemaWithVisibleDependency = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                shadeCount: {
                  defaultValue: 2,
                  label: "Shades",
                  max: 5,
                  min: 1,
                  step: 1,
                  target: "shapes.shadeCount",
                  type: "slider",
                  variant: "discrete",
                },
                shade3: {
                  defaultValue: { hex: "#BBBBBB" },
                  label: "Shade 3",
                  target: "shapes.color3",
                  type: "color",
                  visibleWhen: {
                    greaterThanOrEqual: 3,
                    target: "shapes.count",
                  },
                },
              },
              title: "Shapes",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithVisibleDependency,
        acceptance: [
          makeControlAcceptance("shapes.shadeCount", "slider"),
          makeControlAcceptance("shapes.color3", "color"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "visibleWhen target shapes.count does not match another schema control target",
        ),
        expect.stringContaining(
          "uses visibleWhen and must declare visibilityCoverage",
        ),
      ]),
    );

    const schemaWithValidVisibleDependency = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                shadeCount: {
                  defaultValue: 2,
                  label: "Shades",
                  max: 5,
                  min: 1,
                  step: 1,
                  target: "shapes.shadeCount",
                  type: "slider",
                  variant: "discrete",
                },
                shade3: {
                  defaultValue: { hex: "#BBBBBB" },
                  label: "Shade 3",
                  target: "shapes.color3",
                  type: "color",
                  visibleWhen: {
                    greaterThanOrEqual: 3,
                    target: "shapes.shadeCount",
                  },
                },
              },
              title: "Shapes",
            },
          ],
          title: "Controls",
        },
      },
    });
    const errors = validateContractAcceptance({
      schema: schemaWithValidVisibleDependency,
      acceptance: [
        makeControlAcceptance("shapes.shadeCount", "slider"),
        {
          ...makeControlAcceptance("shapes.color3", "color"),
          expectedObservable: "Третий цвет доступен только для соответствующего состояния продукта.",
          userAction: "Переключить количество оттенков и проверить оба состояния.",
          visibilityCoverage: ["hidden", "visible"],
        },
      ],
    });

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("visibleWhen target"),
        expect.stringContaining("uses visibleWhen and must declare visibilityCoverage"),
      ]),
    );
  });
});
