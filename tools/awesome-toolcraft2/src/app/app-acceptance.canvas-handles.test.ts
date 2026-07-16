import { describe, expect, it } from "vitest";

import {
  contractAcceptanceFixture,
  contractSchemaFixture,
  validateContractAcceptance,
} from "./app-acceptance.contract-fixtures";

describe("Toolcraft starter canvas handle acceptance coverage", () => {
  it("requires canvas handles to declare runtime, browser, and export-clean coverage", () => {
    expect(
      validateContractAcceptance({
        schema: contractSchemaFixture,
        acceptance: [
          ...contractAcceptanceFixture,
          {
            automated: true,
            automatedTestName: "gradient focus handle changes rendered output",
            browser: true,
            browserTestName: "browser: gradient focus handle drags on canvas",
            componentType: "canvas-handle",
            evidence: "product-output",
            expectedObservable: "Dragging the focus handle moves the gradient hotspot.",
            fixture: "radial gradient fixture",
            id: "shader.focus.handle",
            kind: "canvas-handle",
            userAction: "Drag the focus handle on the canvas.",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "shader.focus.handle canvas handle is missing canvasHandle metadata.",
      ]),
    );
  });

  it("requires canvas handle write targets to exist in schema or editor commands", () => {
    expect(
      validateContractAcceptance({
        schema: contractSchemaFixture,
        acceptance: [
          ...contractAcceptanceFixture,
          {
            automated: true,
            automatedTestName: "gradient focus handle changes rendered output",
            browser: true,
            browserTestName: "browser: gradient focus handle drags on canvas",
            canvasHandle: {
              exportCleanTestName: "export excludes gradient focus handle",
              outputObservable: "The gradient hotspot moves after dragging the handle.",
              testId: "gradient-focus-handle",
              writesTarget: "missing.target",
            },
            componentType: "canvas-handle",
            evidence: "product-output",
            expectedObservable: "Dragging the focus handle moves the gradient hotspot.",
            fixture: "radial gradient fixture",
            id: "shader.focus.handle",
            kind: "canvas-handle",
            userAction: "Drag the focus handle on the canvas.",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "shader.focus.handle canvas handle writesTarget missing.target does not match a schema target or supported editor command.",
      ]),
    );
  });
});
