import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./acceptance/types";

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: { mode: "none" },
  mode: "new-toolcraft-app",
};

export const appProductReadiness: ToolcraftProductReadiness = {
  mode: "starter",
  reason:
    "Neutral Toolcraft template before a product schema, renderer, and acceptance matrix are authored.",
};

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [];

export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = [];
