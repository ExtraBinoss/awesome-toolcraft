import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import {
  makeBackgroundSection,
  makeImageExportSection,
} from "./app-acceptance.export-test-utils";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("Toolcraft background export acceptance contract", () => {
  it("requires png export apps to expose background color and png background toggle controls", () => {
    const schemaWithoutBackgroundControls = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "upload-simple",
                      label: "Export PNG",
                      role: "export-image",
                      value: "export.png",
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

    expect(
      validateContractAcceptance({
        schema: schemaWithoutBackgroundControls,
        acceptance: [
          {
            actionCoverage: ["export.png"],
            automated: true,
            automatedTestName: "exports png output",
            browser: true,
            browserTestName: "browser: exports png output",
            componentType: "panelActions",
            evidence: "exported-bytes",
            expectedObservable: "Export PNG creates output bytes.",
            fixture: "export fixture",
            id: "actions.output",
            kind: "control",
            target: "actions.output",
            userAction: "Click Export PNG.",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("must expose a user-facing background color control"),
        expect.stringContaining('must expose export.includeBackground inside the required "Background" section'),
      ]),
    );
  });

  it("rejects legacy output sections that mix background controls with export actions", () => {
    const schemaWithLegacyBackgroundControls = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                background: {
                  defaultValue: "#ffffff",
                  label: "Background",
                  target: "appearance.background",
                  type: "color",
                },
                includeBackground: {
                  defaultValue: true,
                  label: "Include background",
                  target: "export.includeBackground",
                  type: "switch",
                },
                outputActions: {
                  actions: [
                    {
                      icon: "upload-simple",
                      label: "Export PNG",
                      role: "export-image",
                      value: "export.png",
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

    expect(
      validateContractAcceptance({
        schema: schemaWithLegacyBackgroundControls,
        acceptance: [
          makeControlAcceptance("appearance.background", "color"),
          makeControlAcceptance("export.includeBackground", "switch"),
          {
            actionCoverage: ["export.png"],
            automated: true,
            automatedTestName: "exports png output",
            browser: true,
            browserTestName: "browser: exports png output",
            componentType: "panelActions",
            evidence: "exported-bytes",
            expectedObservable: "Export PNG creates output bytes.",
            fixture: "export fixture",
            id: "actions.output",
            kind: "control",
            target: "actions.output",
            userAction: "Click Export PNG.",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('separate controls section titled "Background"'),
        expect.stringContaining(
          'The "Background" section must contain export.includeBackground as the Include switch.',
        ),
        expect.stringContaining(
          'The "Background" section must contain the renderer-owned background color control',
        ),
      ]),
    );
  });

  it("accepts png export apps that wire background controls into the schema", () => {
    const schemaWithBackgroundControls = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeBackgroundSection(),
            makeImageExportSection(),
            {
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "upload-simple",
                      label: "Export PNG",
                      role: "export-image",
                      value: "export.png",
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
    const errors = validateContractAcceptance({
      schema: schemaWithBackgroundControls,
      acceptance: [
        makeControlAcceptance("appearance.background", "color"),
        {
          ...makeControlAcceptance("export.includeBackground", "switch"),
          backgroundOutputCoverage: [
            "preview-hidden-when-excluded",
            "image-transparent-when-excluded",
          ],
          expectedObservable: "Переключатель изменяет фон предпросмотра и растрового результата.",
          userAction: "Отключить фон и проверить оба результата.",
        },
        {
          actionCoverage: ["export.png"],
          automated: true,
          automatedTestName: "exports png output with current background settings",
          browser: true,
          browserTestName: "browser: exports png output with current background settings",
          componentType: "panelActions",
          evidence: "exported-bytes",
          expectedObservable: "Export PNG creates output bytes and reads background color plus include-background state.",
          fixture: "export fixture",
          id: "actions.output",
          kind: "control",
          target: "actions.output",
          userAction: "Toggle Include background, change Background, then click Export PNG.",
        },
      ],
    });

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("must expose a user-facing background color control"),
        expect.stringContaining('must expose export.includeBackground inside the required "Background" section'),
      ]),
    );
  });

  it("requires include-background acceptance to hide preview background and keep video background", () => {
    const schemaWithBackgroundControls = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeBackgroundSection(),
            makeImageExportSection(),
            {
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "upload-simple",
                      label: "Export PNG",
                      role: "export-image",
                      value: "export.png",
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

    expect(
      validateContractAcceptance({
        schema: schemaWithBackgroundControls,
        acceptance: [
          makeControlAcceptance("appearance.background", "color"),
          makeControlAcceptance("export.includeBackground", "switch"),
          {
            actionCoverage: ["export.png"],
            automated: true,
            automatedTestName: "exports png output with current background settings",
            browser: true,
            browserTestName: "browser: exports png output with current background settings",
            componentType: "panelActions",
            evidence: "exported-bytes",
            expectedObservable: "Export PNG creates output bytes and reads background color plus include-background state.",
            fixture: "export fixture",
            id: "actions.output",
            kind: "control",
            target: "actions.output",
            userAction: "Toggle Include background, change Background, then click Export PNG.",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "controls background inclusion and must declare backgroundOutputCoverage",
        ),
      ]),
    );
  });

  it("requires video background coverage only when video export is present", () => {
    const schemaWithVideoExport = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeBackgroundSection(),
            makeImageExportSection(),
            {
              controls: {
                outputActions: {
                  actions: [
                    {
                      label: "Export PNG",
                      role: "export-image",
                      value: "export.png",
                    },
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

    expect(
      validateContractAcceptance({
        schema: schemaWithVideoExport,
        acceptance: [
          makeControlAcceptance("appearance.background", "color"),
          {
            ...makeControlAcceptance("export.includeBackground", "switch"),
            backgroundOutputCoverage: [
              "preview-hidden-when-excluded",
              "image-transparent-when-excluded",
            ],
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("video-background-preserved"),
      ]),
    );
  });
});
