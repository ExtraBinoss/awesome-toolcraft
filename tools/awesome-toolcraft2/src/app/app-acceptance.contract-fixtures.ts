import { defineToolcraft } from "@/toolcraft/runtime";

import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftTransferMode,
} from "./acceptance/types";
import {
  validateToolcraftAcceptanceDiagnostics,
  validateToolcraftAcceptanceCoverage,
  type ToolcraftAcceptanceValidationInput,
} from "./acceptance/validate-coverage";

export const contractSchemaFixture = defineToolcraft({
  canvas: {
    enabled: true,
    upload: true,
  },
  panels: {
    controls: {
      sections: [],
      title: "Controls",
    },
  },
  toolbar: {
    history: true,
    radar: true,
    zoom: true,
  },
});

export const contractAcceptanceFixture: readonly ToolcraftComponentAcceptance[] = [];

export const contractSectionInventoryFixture: readonly ToolcraftControlSectionInventoryEntry[] = [];

export const contractTransferModeFixture: ToolcraftTransferMode = {
  animationIntent: { mode: "none" },
  mode: "new-toolcraft-app",
};

export function validateContractAcceptance(
  overrides: Partial<ToolcraftAcceptanceValidationInput> = {},
): string[] {
  return validateToolcraftAcceptanceCoverage({
    acceptance: contractAcceptanceFixture,
    schema: contractSchemaFixture,
    sectionInventory: contractSectionInventoryFixture,
    transferMode: contractTransferModeFixture,
    ...overrides,
  });
}

export function validateContractAcceptanceDiagnostics(
  overrides: Partial<ToolcraftAcceptanceValidationInput> = {},
) {
  return validateToolcraftAcceptanceDiagnostics({
    acceptance: contractAcceptanceFixture,
    schema: contractSchemaFixture,
    sectionInventory: contractSectionInventoryFixture,
    transferMode: contractTransferModeFixture,
    ...overrides,
  });
}
