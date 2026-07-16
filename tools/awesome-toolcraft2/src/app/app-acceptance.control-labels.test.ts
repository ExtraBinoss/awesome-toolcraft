import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("starter acceptance control label contract", () => {
  it("rejects splitting FontPicker-owned typography into sibling controls", () => {
    const schemaWithSplitTypographyBlock = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                font: {
                  defaultValue: {
                    color: "#FFFFFF",
                    fontId: "inter",
                    fontSize: 16,
                    fontWeight: "400",
                    letterSpacing: "normal",
                    lineHeight: "normal",
                    opacity: 100,
                    textCase: "original",
                  },
                  label: "Font",
                  orderRole: "primary",
                  target: "text.font",
                  type: "fontPicker",
                },
                textCase: {
                  defaultValue: "uppercase",
                  label: "Case",
                  options: [
                    { label: "As typed", value: "original" },
                    { label: "Uppercase", value: "uppercase" },
                  ],
                  orderRole: "primary",
                  target: "text.case",
                  type: "select",
                },
                textColor: {
                  defaultValue: { hex: "#DEF135", opacity: 100 },
                  label: "Color",
                  orderRole: "color",
                  target: "text.color",
                  type: "colorOpacity",
                },
              },
              title: "Text",
            },
          ],
          title: "Controls",
        },
      },
    });

    const fontAcceptance = makeControlAcceptance("text.font", "fontPicker");
    fontAcceptance.controlPartCoverage = [
      "fontPicker.fontId",
      "fontPicker.fontWeight",
      "fontPicker.fontSize",
      "fontPicker.letterSpacing",
      "fontPicker.lineHeight",
      "fontPicker.textCase",
      "fontPicker.color",
      "fontPicker.opacity",
    ];

    const colorAcceptance = makeControlAcceptance("text.color", "colorOpacity");
    colorAcceptance.controlPartCoverage = [
      "colorOpacity.hex",
      "colorOpacity.opacity",
    ];

    expect(
      validateContractAcceptance({
        schema: schemaWithSplitTypographyBlock,
        acceptance: [
          fontAcceptance,
          makeControlAcceptance("text.case", "select"),
          colorAcceptance,
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Text / textCase splits "Case" out of the FontPicker-owned typography block for "text". Keep font family, weight, size, case, letter spacing, line height, color, and opacity in the same fontPicker value.',
        'Text / textColor splits "Color" out of the FontPicker-owned typography block for "text". Keep font family, weight, size, case, letter spacing, line height, color, and opacity in the same fontPicker value.',
      ]),
    );
  });

  it("rejects FontPicker descriptions that only enumerate owned fields", () => {
    const schemaWithRedundantFontHelp = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                font: {
                  defaultValue: {
                    color: "#FFFFFF",
                    fontId: "inter",
                    fontSize: 16,
                    fontWeight: "400",
                    letterSpacing: "normal",
                    lineHeight: "normal",
                    opacity: 100,
                    textCase: "original",
                  },
                  description:
                    "Controls the family, weight, size, case, color, opacity, letter spacing, and line height used by the text.",
                  label: "Font",
                  orderRole: "primary",
                  target: "text.font",
                  type: "fontPicker",
                },
              },
              title: "Font",
            },
          ],
          title: "Controls",
        },
      },
    });

    const fontAcceptance = makeControlAcceptance("text.font", "fontPicker");
    fontAcceptance.controlPartCoverage = [
      "fontPicker.fontId",
      "fontPicker.fontWeight",
      "fontPicker.fontSize",
      "fontPicker.letterSpacing",
      "fontPicker.lineHeight",
      "fontPicker.textCase",
      "fontPicker.color",
      "fontPicker.opacity",
    ];

    expect(validateContractAcceptance({
      schema: schemaWithRedundantFontHelp,
      acceptance: [
        fontAcceptance,
      ],
    })).toEqual(
      expect.arrayContaining([
        "Font / font description repeats FontPicker-owned fields (font family, font weight, font size, case, color, opacity, letter spacing, line height). FontPicker help must explain only non-obvious product behavior; use section titles and visible field labels for font family, weight, size, case, color, opacity, letter spacing, and line height, or omit description.",
      ]),
    );
  });

  it("rejects redundant descriptions in obvious color sections", () => {
    const schemaWithObviousColorHelp = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                color1: {
                  defaultValue: { hex: "#DFFF1A" },
                  description: "Sets the first bead color.",
                  label: "Color 1",
                  target: "beads.color1",
                  type: "color",
                },
                color2: {
                  defaultValue: { hex: "#8CFF3A" },
                  description: "Sets the second bead color.",
                  label: "Color 2",
                  target: "beads.color2",
                  type: "color",
                },
                colorSpread: {
                  defaultValue: 34,
                  description:
                    "Controls how often beads use colors 2-5 instead of Color 1.",
                  label: "Spread",
                  max: 100,
                  min: 0,
                  target: "beads.colorSpread",
                  type: "slider",
                  unit: "%",
                },
              },
              title: "Bead Colors",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(validateContractAcceptance({
      schema: schemaWithObviousColorHelp,
      acceptance: [
        makeControlAcceptance("beads.color1", "color"),
        makeControlAcceptance("beads.color2", "color"),
        makeControlAcceptance("beads.colorSpread", "slider"),
      ],
    })).toEqual(
      expect.arrayContaining([
        "Bead Colors / color1 description adds a help icon to an obvious color-section control. Omit control.description when the section title and visible label already explain the setting.",
        "Bead Colors / color2 description adds a help icon to an obvious color-section control. Omit control.description when the section title and visible label already explain the setting.",
        "Bead Colors / colorSpread description adds a help icon to an obvious color-section control. Omit control.description when the section title and visible label already explain the setting.",
      ]),
    );
  });

  it("rejects visible labels for palette variation color banks", () => {
    const schemaWithLabeledPaletteBank = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                accent1: {
                  defaultValue: { hex: "#9CE6FF" },
                  label: "Color 1",
                  target: "palette.accent1",
                  type: "color",
                },
                accent2: {
                  defaultValue: { hex: "#FF7A90" },
                  label: "Color 2",
                  target: "palette.accent2",
                  type: "color",
                },
                spread: {
                  defaultValue: 34,
                  label: "Spread",
                  max: 100,
                  min: 0,
                  target: "palette.spread",
                  type: "slider",
                  unit: "%",
                },
              },
              title: "Accent Shades",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithLabeledPaletteBank,
        acceptance: [
          makeControlAcceptance("palette.accent1", "color"),
          makeControlAcceptance("palette.accent2", "color"),
          makeControlAcceptance("palette.spread", "slider"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Accent Shades / accent1 uses visible label "Color 1" for a palette variation color. When colors only add variety to one shared palette, set label: false or use collectionActions with unlabeled items. Keep visible labels only when each color edits a distinct user-facing entity such as Fill, Stroke, Background, Connector, or Object color.',
        'Accent Shades / accent2 uses visible label "Color 2" for a palette variation color. When colors only add variety to one shared palette, set label: false or use collectionActions with unlabeled items. Keep visible labels only when each color edits a distinct user-facing entity such as Fill, Stroke, Background, Connector, or Object color.',
      ]),
    );
  });

  it("rejects mixed label visibility inside one palette variation color group", () => {
    const schemaWithMixedPaletteBankLabels = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                accent1: {
                  defaultValue: { hex: "#9CE6FF" },
                  label: false,
                  target: "palette.accent1",
                  type: "color",
                },
                accent2: {
                  defaultValue: { hex: "#FF7A90" },
                  label: "Color 2",
                  target: "palette.accent2",
                  type: "color",
                },
                accent3: {
                  defaultValue: { hex: "#FFD166" },
                  label: false,
                  target: "palette.accent3",
                  type: "color",
                },
              },
              title: "Accent Shades",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithMixedPaletteBankLabels,
        acceptance: [
          makeControlAcceptance("palette.accent1", "color"),
          makeControlAcceptance("palette.accent2", "color"),
          makeControlAcceptance("palette.accent3", "color"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "Accent Shades mixes labeled and unlabeled color items in one palette variation group. Decide label visibility for the whole group: omit all per-item labels when colors only add variety, or label every item only when each color has a distinct user-facing role.",
        'Accent Shades / accent2 uses visible label "Color 2" for a palette variation color. When colors only add variety to one shared palette, set label: false or use collectionActions with unlabeled items. Keep visible labels only when each color edits a distinct user-facing entity such as Fill, Stroke, Background, Connector, or Object color.',
      ]),
    );
  });

  it("allows unlabeled palette variation colors and labeled distinct color roles", () => {
    const schemaWithUsefulColorLabels = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                accent1: {
                  defaultValue: { hex: "#9CE6FF" },
                  label: false,
                  target: "palette.accent1",
                  type: "color",
                },
                accent2: {
                  defaultValue: { hex: "#FF7A90" },
                  label: false,
                  target: "palette.accent2",
                  type: "color",
                },
                spread: {
                  defaultValue: 34,
                  label: "Spread",
                  max: 100,
                  min: 0,
                  target: "palette.spread",
                  type: "slider",
                  unit: "%",
                },
              },
              title: "Accent Shades",
            },
            {
              controls: {
                fill: {
                  defaultValue: { hex: "#FFFFFF" },
                  label: "Fill",
                  target: "object.fill",
                  type: "color",
                },
                stroke: {
                  defaultValue: { hex: "#111111" },
                  label: "Stroke",
                  target: "object.stroke",
                  type: "color",
                },
              },
              title: "Object Colors",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithUsefulColorLabels,
        acceptance: [
          makeControlAcceptance("palette.accent1", "color"),
          makeControlAcceptance("palette.accent2", "color"),
          makeControlAcceptance("palette.spread", "slider"),
          makeControlAcceptance("object.fill", "color"),
          makeControlAcceptance("object.stroke", "color"),
        ],
      }),
    ).toEqual([]);
  });

});
