import { describe, expect, it } from "vitest";

import {
  appAcceptance,
  appControlSectionInventory,
  appTransferMode,
  validateProductAcceptanceCoverage,
  validateToolcraftAcceptanceCoverage,
} from "./app-acceptance";
import { appSchema } from "./app-schema";
import { schemaHasProductSurface } from "./app-acceptance.schema-test-utils";

describe("Toolcraft starter base acceptance coverage", () => {
  it("requires acceptance coverage for every visible schema control", () => {
    expect(validateProductAcceptanceCoverage()).toEqual([]);
  });

  it("validates equivalent product data independently from object identity", () => {
    const clonedSchema = structuredClone(appSchema);
    const clonedAcceptance = structuredClone(appAcceptance);
    const clonedTransferMode = structuredClone(appTransferMode);
    const clonedSectionInventory = structuredClone(appControlSectionInventory);

    expect(
      validateToolcraftAcceptanceCoverage({
        acceptance: clonedAcceptance,
        schema: clonedSchema,
        sectionInventory: clonedSectionInventory,
        transferMode: clonedTransferMode,
      }),
    ).toEqual(validateProductAcceptanceCoverage());
  });

  it("requires generated product apps to publish a control section inventory", () => {
    if (!schemaHasProductSurface()) {
      expect(appControlSectionInventory).toEqual([]);
      return;
    }

    expect(
      appControlSectionInventory.length,
      "Product apps must export appControlSectionInventory so section grouping decisions are machine-checkable.",
    ).toBeGreaterThan(0);
    expect(validateProductAcceptanceCoverage()).toEqual([]);
  });

});
