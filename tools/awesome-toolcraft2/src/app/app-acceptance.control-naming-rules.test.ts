import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("starter acceptance control naming rules", () => {
  it("rejects Enable or Disable prefixes on binary control labels", () => {
    const schemaWithActionLabels = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                crt: {
                  defaultValue: true,
                  label: "Enable CRT",
                  target: "style.crt",
                  type: "switch",
                },
                guides: {
                  defaultValue: false,
                  label: "Disable guides",
                  target: "overlay.guides",
                  type: "checkbox",
                },
              },
              title: "Style",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithActionLabels,
        acceptance: [
          makeControlAcceptance("style.crt", "switch"),
          makeControlAcceptance("overlay.guides", "checkbox"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'style.crt) toggle labels must name the setting context only; use "CRT", "Background", "Glow", or "Loop" instead of "Enable CRT".',
        ),
        expect.stringContaining(
          'overlay.guides) toggle labels must name the setting context only; use "CRT", "Background", "Glow", or "Loop" instead of "Disable guides".',
        ),
      ]),
    );

    const schemaWithContextLabels = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                crt: {
                  defaultValue: true,
                  label: "CRT",
                  target: "style.crt",
                  type: "switch",
                },
                guides: {
                  defaultValue: false,
                  label: "Guides",
                  target: "overlay.guides",
                  type: "checkbox",
                },
              },
              title: "Style",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateContractAcceptance({
      schema: schemaWithContextLabels,
      acceptance: [
        makeControlAcceptance("style.crt", "switch"),
        makeControlAcceptance("overlay.guides", "checkbox"),
      ],
    });

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("toggle labels must name the setting context only"),
      ]),
    );
  });

  it("rejects binary control labels that duplicate their section title", () => {
    const schemaWithDuplicateToggleLabel = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                includeBackground: {
                  defaultValue: true,
                  label: "Background",
                  target: "export.includeBackground",
                  type: "switch",
                },
              },
              title: "Background",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithDuplicateToggleLabel,
        acceptance: [
          makeControlAcceptance("export.includeBackground", "switch"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'export.includeBackground) toggle label "Background" duplicates section title "Background". Use a shorter contextual label such as "Include" or rename the toggle to a more specific setting.',
        ),
      ]),
    );
  });

  it("rejects single Actions controls that duplicate their only button label", () => {
    const schemaWithDuplicateActionLabel = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                wash: {
                  actions: [{ label: "Wash", value: "wash" }],
                  defaultValue: null,
                  label: "Wash",
                  target: "flow.washSignal",
                  type: "actions",
                },
              },
              title: "Flow",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithDuplicateActionLabel,
        acceptance: [
          makeControlAcceptance("flow.washSignal", "actions"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'flow.washSignal) single Actions control label "Wash" duplicates its only button label "Wash". Keep the button as the command and use a short context label such as "Ink wash", "Palette action", or "Current layer".',
        ),
      ]),
    );
  });

  it("allows single Actions controls with a concise context label", () => {
    const schemaWithContextActionLabel = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                wash: {
                  actions: [{ label: "Wash", value: "wash" }],
                  defaultValue: null,
                  label: "Ink wash",
                  target: "flow.washSignal",
                  type: "actions",
                },
              },
              title: "Flow",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateContractAcceptance({
      schema: schemaWithContextActionLabel,
      acceptance: [
        makeControlAcceptance("flow.washSignal", "actions"),
      ],
    });

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("single Actions control label"),
      ]),
    );
  });
});
