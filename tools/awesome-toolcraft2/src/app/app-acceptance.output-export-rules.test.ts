import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import { schemaRequiresVideoExport } from "./app-acceptance.video-export-test-utils";

describe("Toolcraft output export synthetic rules", () => {
  it("does not force decorative autonomous animation into video export", () => {
    const autonomousSchema = defineToolcraft({
      canvas: { enabled: true },
      panels: { controls: { sections: [], title: "Controls" } },
    });

    expect(
      schemaRequiresVideoExport(autonomousSchema, {
        animationIntent: {
          behaviorCoverage: [
            "no-duration-control",
            "no-export-at-time",
            "no-loop-control",
            "no-play-pause",
            "no-scrub",
            "no-user-facing-transport",
          ],
          mode: "autonomous",
          reason: "Decorative ambient motion has no user-facing product time.",
        },
        mode: "new-toolcraft-app",
      }),
    ).toBe(false);
  });

  it("rejects reset actions in sticky footer panelActions", () => {
    const schemaWithFooterReset = defineToolcraft({
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
                      command: "controls.reset",
                      icon: "rotate-ccw",
                      label: "Reset",
                      value: "reset",
                    },
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
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        acceptance: [
          {
            actionCoverage: ["reset", "export.png"],
            automated: true,
            automatedTestName: "footer actions reset and export output",
            browser: true,
            browserTestName: "browser: footer actions reset and export output",
            componentType: "panelActions",
            evidence: "exported-bytes",
            expectedObservable: "Footer actions reset controls and export output.",
            fixture: "footer actions fixture",
            id: "actions.output",
            kind: "control",
            target: "actions.output",
            userAction: "Click Reset and Export PNG.",
          },
        ],
        schema: schemaWithFooterReset,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("must not include Reset footer actions (reset)"),
      ]),
    );
  });
});
