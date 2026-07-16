import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("Toolcraft starter persistence acceptance coverage", () => {
  it("requires browser reload acceptance when localStorage persistence is enabled", () => {
    const persistentSchema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 0.75,
                  label: "Opacity",
                  target: "appearance.opacity",
                  type: "slider",
                },
              },
              title: "Appearance",
            },
          ],
          title: "Controls",
        },
      },
      persistence: {
        include: ["values", "panels"],
        key: "toolcraft:persistence-acceptance-test:state:v1",
        storage: "localStorage",
        version: 1,
      },
    });

    expect(
      validateContractAcceptance({
        schema: persistentSchema,
        acceptance: [
          {
            automated: true,
            automatedTestName: "opacity changes product output",
            browser: true,
            browserTestName: "browser: opacity changes product output",
            componentType: "slider",
            evidence: "product-output",
            expectedObservable: "Changing Opacity changes rendered product opacity.",
            fixture: "opacity fixture",
            id: "appearance.opacity",
            kind: "control",
            target: "appearance.opacity",
            userAction: "Drag the Opacity slider.",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'persistence.storage "localStorage" requires a runtime acceptance entry with persistenceCoverage "reload" proving user-edited persisted state restores after a real browser reload. Settings import/export is not a substitute for persistence.',
      ]),
    );
  });

  it("accepts typed reload coverage without relying on English prose", () => {
    const persistentSchema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 0.75,
                  label: "Opacity",
                  target: "appearance.opacity",
                  type: "slider",
                },
              },
              title: "Appearance",
            },
          ],
          title: "Controls",
        },
      },
      persistence: {
        include: ["values", "panels"],
        key: "toolcraft:persistence-acceptance-test:state:v1",
        storage: "localStorage",
        version: 1,
      },
    });

    expect(
      validateContractAcceptance({
        schema: persistentSchema,
        acceptance: [
          {
            automated: true,
            automatedTestName: "opacity changes product output",
            browser: true,
            browserTestName: "browser: opacity changes product output",
            componentType: "slider",
            evidence: "product-output",
            expectedObservable: "Changing Opacity changes rendered product opacity.",
            fixture: "opacity fixture",
            id: "appearance.opacity",
            kind: "control",
            target: "appearance.opacity",
            userAction: "Drag the Opacity slider.",
          },
          {
            automated: true,
            automatedTestName: "exports and imports settings",
            browser: true,
            browserTestName: "browser: exports and imports settings",
            componentType: "persistence",
            evidence: "persistence-state",
            expectedObservable: "El valor editado reaparece después de recargar.",
            fixture: "settings transfer fixture",
            id: "persistence.reload",
            kind: "runtime",
            persistenceCoverage: "reload",
            target: "persistence.reload",
            userAction: "Cambiar el valor, recargar la página y observar el estado.",
          },
        ],
      }),
    ).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("must describe changing a user-facing setting"),
      ]),
    );
  });
});
