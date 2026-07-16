"use client";

import * as React from "react";
import {
  Panel,
  type ControlChangeMeta,
} from "@/toolcraft/ui";

import type {
  ToolcraftControlSectionSchema,
  ToolcraftControlSchema,
} from "../../schema/types";
import type {
  ToolcraftCommand,
  ToolcraftPanelState,
} from "../../state/types";
import {
  getToolcraftTargetValue,
  isToolcraftControlDisabled,
  isToolcraftControlVisible,
  isToolcraftSectionVisible,
} from "./conditions/control-conditions";
import {
  type ToolcraftPanelActionHandler,
  useControlsPanelActions,
} from "./actions/controls-panel-actions";
import { createControlsPanelKeyframeActions } from "./keyframes/controls-panel-keyframes";
import { renderControlsPanelSection } from "./layout/controls-panel-section";
import { PanelContainer } from "../panel-host/panel-host";
import type { PanelPlacement, PanelStateChange } from "../panel-host/panel-host-types";
import type { ToolcraftControlRendererMap } from "./control-renderers";
import { formatControlValueLabel } from "./values/controls-panel-values";
import {
  type ControlEntry,
  countControlsByType,
  getControlName,
  getControlsRecord,
} from "./layout/controls-panel-layout";
import {
  getControlsPanelSectionCollapseStorageKey,
  readControlsPanelCollapsedSections,
  writeControlsPanelCollapsedSections,
} from "./layout/controls-panel-collapse-storage";
import { useToolcraft } from "../app-shell/use-toolcraft";

export type {
  ToolcraftPanelActionContext,
  ToolcraftPanelActionHandler,
} from "./actions/controls-panel-actions";

export type ControlsPanelProps = {
  className?: string;
  controlRenderers?: ToolcraftControlRendererMap;
  framed?: boolean;
  onPanelAction?: ToolcraftPanelActionHandler;
  onPanelStateChange?: PanelStateChange;
  panelPlacement?: PanelPlacement;
  panelState?: ToolcraftPanelState;
};

function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function ControlsPanel({
  className,
  controlRenderers,
  framed = true,
  onPanelAction,
  onPanelStateChange,
  panelPlacement,
  panelState,
}: ControlsPanelProps): React.JSX.Element | null {
  const { dispatch, state } = useToolcraft();
  const {
    runAction,
    stickyFooterActive,
    stickyFooterProgress,
  } = useControlsPanelActions({ dispatch, onPanelAction, state });
  const sectionCollapseStorageKey = React.useMemo(
    () => getControlsPanelSectionCollapseStorageKey(state.schema),
    [state.schema],
  );
  const [collapsedSectionByKey, setCollapsedSectionByKey] = React.useState<
    Record<string, boolean>
  >(() => readControlsPanelCollapsedSections(sectionCollapseStorageKey));
  const controlsPanel = state.schema.panels.controls;
  const keyframedControlIds = React.useMemo(
    () => new Set(state.timeline.keyframeGroups.map((group) => group.controlId)),
    [state.timeline.keyframeGroups],
  );
  const keyframeControlsEnabled = Boolean(
    state.schema.assembly.capabilities.includes("timeline.keyframes") &&
      state.timeline.expanded,
  );

  React.useEffect(() => {
    setCollapsedSectionByKey(readControlsPanelCollapsedSections(sectionCollapseStorageKey));
  }, [sectionCollapseStorageKey]);

  if (!controlsPanel) {
    return null;
  }

  const resolvedControlsPanel = controlsPanel;
  const placement = panelPlacement ?? (framed ? "frame" : "surface");
  const lastHistoryPatch = state.history.undo.at(-1);
  const controlsResetKey =
    lastHistoryPatch?.label === "Reset controls" ? state.history.undo.length : 0;

  function dispatchCommand(command: ToolcraftCommand): void {
    dispatch(command);
  }

  function setControlValue(
    target: string,
    value: unknown,
    label?: string,
    meta?: ControlChangeMeta,
  ): void {
    dispatchCommand({
      history: meta?.history,
      historyGroup: meta?.historyGroup,
      label,
      target,
      type: "controls.setValue",
      value,
    });
  }

  function getControlValue(control: ToolcraftControlSchema): unknown {
    return getToolcraftTargetValue(state, control.target) ?? control.defaultValue;
  }

  function isControlDisabled(control: ToolcraftControlSchema): boolean {
    return isToolcraftControlDisabled(state, control);
  }

  function isControlVisible(control: ToolcraftControlSchema): boolean {
    return isToolcraftControlVisible(state, control);
  }

  function isSectionVisible(section: ToolcraftControlSectionSchema): boolean {
    return isToolcraftSectionVisible(state, section);
  }

  function getVisibleSectionEntries(
    section: ToolcraftControlSectionSchema,
  ): ControlEntry[] {
    return Object.entries(section.controls).filter(([, control]) =>
      isControlVisible(control),
    );
  }

  const keyframeActions = createControlsPanelKeyframeActions({
    dispatchCommand,
    formatValueLabel: formatControlValueLabel,
    getControlName,
    getControlValue,
    keyframeControlsEnabled,
    keyframedControlIds,
    keyframeGroups: state.timeline.keyframeGroups,
    selectedKeyframeId: state.timeline.selectedKeyframeId,
  });

  function handleSectionCollapsedChange(
    sectionCollapseKey: string,
    collapsed: boolean,
  ): void {
    setCollapsedSectionByKey((current) => {
      const next = {
        ...current,
        [sectionCollapseKey]: collapsed,
      };

      writeControlsPanelCollapsedSections(sectionCollapseStorageKey, next);

      return next;
    });
  }

  const visibleSections = resolvedControlsPanel.sections
    .map((section) => ({
      entries: getVisibleSectionEntries(section),
      section,
    }))
    .filter(({ entries, section }) => isSectionVisible(section) && entries.length > 0);
  const visibleControlsPanelSections = visibleSections.map(({ entries, section }) => ({
    ...section,
    controls: getControlsRecord(entries),
  }));
  const vectorControlCount = countControlsByType(visibleControlsPanelSections, "vector");
  const vectorPadShape = vectorControlCount === 1 ? "square" : "compact";

  const panel = (
    <Panel
      className={cn(
        "shrink-0",
        placement === "frame" && "max-h-none",
        className,
      )}
      collapsed={panelState?.collapsed}
      contentTransitionSuppressionKey={
        keyframeControlsEnabled ? "keyframes" : "plain"
      }
      key={controlsResetKey}
      onCollapsedChange={(collapsed) => onPanelStateChange?.({ collapsed })}
      onResetControls={() => dispatchCommand({ type: "controls.reset" })}
      stickyFooterActive={stickyFooterActive}
      stickyFooterProgress={stickyFooterProgress}
      title={resolvedControlsPanel.title}
    >
      {visibleSections.map(({ entries, section }, sectionIndex) =>
        renderControlsPanelSection({
          collapsedSectionByKey,
          controlRenderers,
          dispatch,
          dispatchCommand,
          entries,
          getControlValue,
          isControlDisabled,
          keyframeActions,
          onSectionCollapsedChange: handleSectionCollapsedChange,
          panelSectionKey: `${section.title ?? "section"}-${sectionIndex}`,
          runAction,
          section,
          sectionIndex,
          setControlValue,
          state,
          vectorPadShape,
        }),
      )}
    </Panel>
  );

  if (placement === "surface") {
    return panel;
  }

  return (
    <PanelContainer
      onPanelStateChange={onPanelStateChange}
      panelState={panelState}
      panelType="controls"
      placement={placement}
    >
      {panel}
    </PanelContainer>
  );
}
