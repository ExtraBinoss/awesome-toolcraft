import {
  isToolcraftPersistenceRecord,
  toolcraftPersistedPanelIds,
} from "./persistence-shared";
import { readPoint } from "./persistence-reader-primitives";
import type {
  ToolcraftPanelId,
  ToolcraftPanelState,
} from "./types";

function readPanel(value: unknown): Partial<ToolcraftPanelState> | undefined {
  if (!isToolcraftPersistenceRecord(value)) {
    return undefined;
  }

  const panel: Partial<ToolcraftPanelState> = {};
  const offset = readPoint(value.offset);

  if (offset) {
    panel.offset = offset;
  }

  if (typeof value.collapsed === "boolean") {
    panel.collapsed = value.collapsed;
  }

  if (typeof value.extended === "boolean") {
    panel.extended = value.extended;
  }

  if (typeof value.hidden === "boolean") {
    panel.hidden = value.hidden;
  }

  return Object.keys(panel).length > 0 ? panel : undefined;
}

export function readPanels(
  value: unknown,
): Partial<Record<ToolcraftPanelId, Partial<ToolcraftPanelState>>> | undefined {
  if (!isToolcraftPersistenceRecord(value)) {
    return undefined;
  }

  const panels: Partial<Record<ToolcraftPanelId, Partial<ToolcraftPanelState>>> = {};

  for (const panelId of toolcraftPersistedPanelIds) {
    const panel = readPanel(value[panelId]);

    if (panel) {
      panels[panelId] = panel;
    }
  }

  return Object.keys(panels).length > 0 ? panels : undefined;
}
