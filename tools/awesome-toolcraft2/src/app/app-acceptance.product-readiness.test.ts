import { describe, expect, it } from "vitest";

import {
  appProductReadiness,
  appTransferMode,
} from "./app-acceptance";
import { isNeutralTemplateProject } from "./app-acceptance.product-readiness-test-utils";
import { schemaHasProductSurface } from "./app-acceptance.schema-test-utils";
import { appSchema } from "./app-schema";

describe("Toolcraft product readiness", () => {
  it("defaults generated apps to new Toolcraft assembly mode", () => {
    if (appProductReadiness.mode !== "starter") {
      return;
    }

    expect(appTransferMode).toEqual({
      animationIntent: { mode: "none" },
      mode: "new-toolcraft-app",
    });
  });

  it("allows neutral readiness only for the source starter/template folder", () => {
    if (appProductReadiness.mode === "product") {
      expect(appProductReadiness.productName.trim()).not.toBe("");
      expect(appProductReadiness.productSummary.trim()).not.toBe("");
      expect(appProductReadiness.requestedBehavior.trim()).not.toBe("");
      expect(
        schemaHasProductSurface(),
        "Product readiness requires product surface: controls, layers, timeline, canvasContent, or acceptance coverage.",
      ).toBe(true);
      expect(
        appSchema.panels.controls,
        "Generated product apps must define a controls panel so runtime Setup, product controls, background, export settings, and sticky export actions are visible.",
      ).toBeTruthy();
      expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
      return;
    }

    expect(appProductReadiness.reason.trim()).not.toBe("");
    expect(
      isNeutralTemplateProject(),
      "Renamed/generated product folders must switch product readiness from starter to product so an empty template cannot pass as an implemented app.",
    ).toBe(true);
    expect(
      schemaHasProductSurface(),
      "Neutral starter readiness must not be used after adding product controls, timeline, layers, canvasContent, or acceptance coverage.",
    ).toBe(false);
  });
});
