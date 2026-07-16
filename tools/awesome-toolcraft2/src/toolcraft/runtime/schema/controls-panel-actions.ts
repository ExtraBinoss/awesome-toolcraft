import { createNormalizedControlsRecord } from "./control-schema-normalization";
import { filterLayoutGroupsForControlIds } from "./controls-panel-layout-groups";
import type {
  ToolcraftControlSchema,
  ToolcraftControlSectionSchema,
} from "./types";

type ToolcraftControlActionSchema = NonNullable<
  ToolcraftControlSchema["actions"]
>[number];

function isPanelActionsControl(control: ToolcraftControlSchema): boolean {
  return control.type === "panelActions";
}

function isPrimaryPanelAction(action: ToolcraftControlActionSchema): boolean {
  return typeof action !== "string" && action.variant !== "outline";
}

function orderPanelActions(
  actions: readonly ToolcraftControlActionSchema[],
): ToolcraftControlActionSchema[] {
  if (actions.length !== 2) {
    return [...actions];
  }

  return [...actions].sort(
    (left, right) => Number(isPrimaryPanelAction(left)) - Number(isPrimaryPanelAction(right)),
  );
}

function createMergedPanelActionsControl(
  entries: readonly [string, ToolcraftControlSchema][],
): ToolcraftControlSchema | null {
  const firstControl = entries[0]?.[1];

  if (!firstControl) {
    return null;
  }

  const actions = entries.flatMap(([, control]) => [...(control.actions ?? [])]);

  return {
    ...firstControl,
    actions: orderPanelActions(actions),
    target: firstControl.target || "panel.actions",
    type: "panelActions",
  };
}

function getBodySectionTitleAfterActionSplit(
  title: ToolcraftControlSectionSchema["title"],
): ToolcraftControlSectionSchema["title"] {
  if (!title) {
    return title;
  }

  return isActionOrExportSectionTitle(title) ? undefined : title;
}

function isActionOrExportSectionTitle(title: string): boolean {
  const normalizedTitle = title.trim().toLowerCase();

  return normalizedTitle === "action" ||
    normalizedTitle === "actions" ||
    normalizedTitle === "export" ||
    normalizedTitle === "exports";
}

export function splitControlsPanelActionSections(
  sections: readonly ToolcraftControlSectionSchema[],
): {
  bodySections: ToolcraftControlSectionSchema[];
  stickyFooterSections: ToolcraftControlSectionSchema[];
} {
  const bodySections: ToolcraftControlSectionSchema[] = [];
  const stickyFooterSections: ToolcraftControlSectionSchema[] = [];
  const stickyFooterActionEntries: [string, ToolcraftControlSchema][] = [];

  for (const section of sections) {
    if (section.actionGroup) {
      const entries = Object.entries(section.controls);
      const actionEntries = entries.filter(([, control]) => isPanelActionsControl(control));
      const passthroughEntries = entries.filter(([, control]) => !isPanelActionsControl(control));

      stickyFooterActionEntries.push(...actionEntries);

      if (passthroughEntries.length > 0) {
        stickyFooterSections.push({
          ...section,
          controls: createNormalizedControlsRecord(passthroughEntries),
        });
      }

      continue;
    }

    const bodyEntries: [string, ToolcraftControlSchema][] = [];
    const actionEntries: [string, ToolcraftControlSchema][] = [];

    for (const entry of Object.entries(section.controls)) {
      const [, control] = entry;

      if (isPanelActionsControl(control)) {
        actionEntries.push(entry);
      } else {
        bodyEntries.push(entry);
      }
    }

    if (bodyEntries.length > 0) {
      const controlIds = new Set(bodyEntries.map(([id]) => id));
      const layoutGroups = filterLayoutGroupsForControlIds(section.layoutGroups, controlIds);
      const title = getBodySectionTitleAfterActionSplit(section.title);

      bodySections.push({
        ...section,
        controls: createNormalizedControlsRecord(bodyEntries),
        layoutGroups: layoutGroups.length > 0 ? layoutGroups : undefined,
        title,
      });
    }

    if (actionEntries.length > 0) {
      stickyFooterActionEntries.push(...actionEntries);
    }
  }

  const mergedActionsControl = createMergedPanelActionsControl(stickyFooterActionEntries);

  if (mergedActionsControl) {
    stickyFooterSections.unshift({
      actionGroup: "secondary",
      controls: { footer: mergedActionsControl },
      layout: "standalone",
      title: "Export",
    });
  }

  return { bodySections, stickyFooterSections };
}
