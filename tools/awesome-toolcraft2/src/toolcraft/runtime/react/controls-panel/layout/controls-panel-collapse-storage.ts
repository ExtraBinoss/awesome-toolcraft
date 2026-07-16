import type {
  ResolvedToolcraftAppSchema,
  ToolcraftControlSectionSchema,
  ToolcraftControlSchema,
} from "../../../schema/types";
import {
  readToolcraftLocalStorageValue,
  removeToolcraftLocalStorageValue,
} from "../../app-shell/storage-key-migration";

const controlsPanelSectionCollapseStorageVersion = 1;

export function getControlsPanelSectionCollapseKey({
  entries,
  section,
  sectionIndex,
}: {
  entries: readonly [string, ToolcraftControlSchema][];
  section: ToolcraftControlSectionSchema;
  sectionIndex: number;
}): string {
  const targets = entries.map(([id, control]) => `${id}:${control.target}`).join("|");

  return `${section.title ?? "section"}:${sectionIndex}:${targets}`;
}

function hashStorageKeyPart(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function getControlsPanelSectionCollapseStorageKey(
  schema: ResolvedToolcraftAppSchema,
): string | null {
  const controlsPanel = schema.panels.controls;

  if (!controlsPanel) {
    return null;
  }

  const appIdentity =
    schema.persistence.storage === "localStorage"
      ? `persistence:${schema.persistence.key}:v${schema.persistence.version}`
      : JSON.stringify({
          sections: controlsPanel.sections.map((section) => ({
            controls: Object.entries(section.controls).map(([id, control]) => ({
              id,
              label: control.label,
              target: control.target,
              type: control.type,
            })),
            title: section.title,
          })),
          title: controlsPanel.title,
        });

  return `toolcraft:ui:controls-panel-sections:${hashStorageKeyPart(appIdentity)}:v${controlsPanelSectionCollapseStorageVersion}`;
}

export function readControlsPanelCollapsedSections(
  storageKey: string | null,
): Record<string, boolean> {
  if (!storageKey || typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = readToolcraftLocalStorageValue(storageKey);

    if (!rawValue) {
      return {};
    }

    const payload: unknown = JSON.parse(rawValue);

    if (
      !payload ||
      typeof payload !== "object" ||
      !("version" in payload) ||
      payload.version !== controlsPanelSectionCollapseStorageVersion ||
      !("collapsed" in payload) ||
      !Array.isArray(payload.collapsed)
    ) {
      return {};
    }

    return Object.fromEntries(
      payload.collapsed
        .filter((item): item is string => typeof item === "string" && item.length > 0)
        .map((item) => [item, true]),
    );
  } catch {
    return {};
  }
}

export function writeControlsPanelCollapsedSections(
  storageKey: string | null,
  collapsedSectionByKey: Record<string, boolean>,
): void {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  const collapsed = Object.entries(collapsedSectionByKey)
    .filter(([, collapsedValue]) => collapsedValue)
    .map(([key]) => key);

  try {
    if (collapsed.length === 0) {
      removeToolcraftLocalStorageValue(storageKey);
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        collapsed,
        version: controlsPanelSectionCollapseStorageVersion,
      }),
    );
  } catch {
    // UI preferences are best-effort; panel interaction stays authoritative.
  }
}
