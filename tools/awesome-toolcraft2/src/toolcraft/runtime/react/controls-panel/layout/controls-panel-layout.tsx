"use client";

import * as React from "react";

import type {
  ToolcraftControlSectionSchema,
  ToolcraftControlSchema,
} from "../../../schema/types";
import {
  getToolcraftCanvasSizeTargetDimension,
  isToolcraftRuntimeOwnedTarget,
} from "../../../schema/runtime-targets";

export type ControlEntry = [string, ToolcraftControlSchema];

export type ControlRenderGroup =
  | { entries: readonly ControlEntry[]; kind: "colorGroup" }
  | { entry: ControlEntry; kind: "control" };

export type RenderedControlRenderGroup = {
  ids: readonly string[];
  node: React.ReactNode;
};

const hiddenDiscreteMarkerCount = 2;
const sectionedCompoundControlTypes = new Set([
  "channelMixer",
  "collectionActions",
  "fontPicker",
  "gradient",
  "palette",
]);

export function shouldRenderCompoundControlSectionDivider(
  control: ToolcraftControlSchema,
): boolean {
  if (control.type === "curves") {
    return control.variant !== "single";
  }

  return sectionedCompoundControlTypes.has(control.type);
}

export function withCompoundControlSectionDivider({
  children,
  control,
}: {
  children: React.ReactNode;
  control: ToolcraftControlSchema;
}): React.ReactNode {
  if (!shouldRenderCompoundControlSectionDivider(control)) {
    return children;
  }

  return (
    <div className="contents" data-control-section-divider="compound">
      {children}
    </div>
  );
}

export function getControlName(
  id: string,
  label: boolean | string | undefined,
): string {
  if (typeof label === "string") {
    return label;
  }

  return id;
}

export function getControlsRecord(
  entries: readonly ControlEntry[],
): Record<string, ToolcraftControlSchema> {
  return Object.fromEntries(entries);
}

export function getControlRenderGroups(
  entries: readonly ControlEntry[],
): ControlRenderGroup[] {
  const groups: ControlRenderGroup[] = [];
  let index = 0;

  while (index < entries.length) {
    const entry = entries[index];

    if (!entry) {
      index += 1;
      continue;
    }

    if (entry[1].type !== "color") {
      groups.push({ entry, kind: "control" });
      index += 1;
      continue;
    }

    const colorEntries: ControlEntry[] = [];

    while (entries[index]?.[1].type === "color") {
      const colorEntry = entries[index];

      if (colorEntry) {
        colorEntries.push(colorEntry);
      }

      index += 1;
    }

    for (let colorIndex = 0; colorIndex < colorEntries.length; colorIndex += 2) {
      const firstEntry = colorEntries[colorIndex];
      const secondEntry = colorEntries[colorIndex + 1];

      if (firstEntry && secondEntry) {
        groups.push({ entries: [firstEntry, secondEntry], kind: "colorGroup" });
      } else if (firstEntry) {
        groups.push({ entry: firstEntry, kind: "control" });
      }
    }
  }

  return groups;
}

export function getControlRenderGroupIds(
  group: ControlRenderGroup,
): readonly string[] {
  return group.kind === "colorGroup"
    ? group.entries.map(([id]) => id)
    : [group.entry[0]];
}

export function countControlsByType(
  sections: readonly ToolcraftControlSectionSchema[],
  type: string,
): number {
  return sections.reduce(
    (count, section) =>
      count +
      Object.values(section.controls).filter((control) => control.type === type)
        .length,
    0,
  );
}

export function shouldCommitTextControlOnBlur(
  control: ToolcraftControlSchema,
): boolean {
  return (
    control.commitMode === "setting" ||
    Boolean(getToolcraftCanvasSizeTargetDimension(control.target))
  );
}

function isColorFieldControl(control: ToolcraftControlSchema | undefined): boolean {
  return control?.type === "color" || control?.type === "colorOpacity";
}

export function isColorOnlySection(entries: readonly ControlEntry[]): boolean {
  return entries.length > 0 && entries.every(([, control]) => isColorFieldControl(control));
}

export function getRenderedControlsSectionTitle(
  section: ToolcraftControlSectionSchema,
): ToolcraftControlSectionSchema["title"] {
  return isStickyFooterActionSection(section) ? undefined : section.title;
}

export function isRuntimeSetupSection({
  entries,
  section,
}: {
  entries: readonly ControlEntry[];
  section: ToolcraftControlSectionSchema;
}): boolean {
  return (
    section.title === "Setup" &&
    entries.some(([, control]) => isToolcraftRuntimeOwnedTarget(control.target))
  );
}

function isStickyFooterActionSection(section: ToolcraftControlSectionSchema): boolean {
  return (
    section.actionGroup !== undefined &&
    Object.values(section.controls).some((control) => control.type === "panelActions")
  );
}

export function shouldShowColorFieldLabel({
  control,
  sectionHasOnlyColorFields,
}: {
  control: ToolcraftControlSchema;
  sectionHasOnlyColorFields: boolean;
}): boolean {
  return control.label !== false && !sectionHasOnlyColorFields;
}

export function getControlMarkerCount(
  control: ToolcraftControlSchema,
  markerLimit?: number,
): number | undefined {
  const markerCount = control.markerCount;

  if (
    markerLimit &&
    control.variant === "discrete" &&
    typeof markerCount === "number" &&
    markerCount > markerLimit
  ) {
    return hiddenDiscreteMarkerCount;
  }

  return markerCount;
}
