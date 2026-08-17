"use client";

import * as React from "react";
import { logToolLoad } from "@/tool-load-debug";
import { Panel } from "@/toolcraft/ui/components/panel/panel";
import type { ControlChangeMeta } from "@/toolcraft/ui/components/controls/control-types";

import type {
  ToolcraftControlSectionSchema,
  ToolcraftControlSchema,
} from "../../schema/types";
import type {
  ToolcraftCommand,
  ToolcraftPanelState,
  ToolcraftState,
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
import {
  preloadControlsPanelRenderers,
  renderControlsPanelSection,
} from "./layout/controls-panel-section";
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
import {
  useToolcraftDispatch,
  useToolcraftSelector,
  useToolcraftStore,
  useToolcraftValues,
} from "../app-shell/use-toolcraft";
import { ControlsPanelVirtualContent } from "./controls-panel-virtual-content";
import { ControlsPanelDelegatedTooltip } from "./controls-panel-delegated-tooltip";

logToolLoad("panel module:evaluated controls");

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

function selectState(state: ToolcraftState): ToolcraftState {
  return state;
}

function getControlsResetKey(state: ToolcraftState): number {
  return state.history.undo.at(-1)?.label === "Reset controls"
    ? state.history.undo.length
    : 0;
}

function controlsPanelStructureMatches(left: ToolcraftState, right: ToolcraftState): boolean {
  return (
    left.schema === right.schema &&
    left.canvas.size === right.canvas.size &&
    left.mediaAssets === right.mediaAssets &&
    left.timeline.keyframeGroups === right.timeline.keyframeGroups &&
    left.timeline.selectedKeyframeId === right.timeline.selectedKeyframeId &&
    getControlsResetKey(left) === getControlsResetKey(right)
  );
}

function ControlsPanelSectionValueSubscription({
  render,
  targets,
}: {
  render: () => React.JSX.Element;
  targets: readonly string[];
}): React.JSX.Element {
  useToolcraftValues(targets);
  return render();
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
  React.useEffect(() => {
    logToolLoad("panel mounted:controls");
  }, []);
  const dispatch = useToolcraftDispatch();
  const store = useToolcraftStore();
  const structuralState = useToolcraftSelector(selectState, controlsPanelStructureMatches);
  const conditionTargets = React.useMemo(() => {
    const targets = new Set<string>();
    for (const section of structuralState.schema.panels.controls?.sections ?? []) {
      if (section.visibleWhen) targets.add(section.visibleWhen.target);
      for (const control of Object.values(section.controls)) {
        if (control.visibleWhen) targets.add(control.visibleWhen.target);
        if (control.disabledWhen) targets.add(control.disabledWhen.target);
      }
    }
    return [...targets];
  }, [structuralState.schema]);
  const conditionValues = useToolcraftValues(conditionTargets);
  const state = React.useMemo<ToolcraftState>(() => ({
    ...structuralState,
    values: { ...structuralState.values, ...conditionValues },
  }), [conditionValues, structuralState]);
  const {
    runAction,
    stickyFooterActive,
    stickyFooterProgress,
  } = useControlsPanelActions({ dispatch, onPanelAction, store });
  const sectionCollapseStorageKey = React.useMemo(
    () => getControlsPanelSectionCollapseStorageKey(state.schema),
    [state.schema],
  );
  const [collapsedSectionByKey, setCollapsedSectionByKey] = React.useState<
    Record<string, boolean>
  >(() => readControlsPanelCollapsedSections(sectionCollapseStorageKey));
  const controlsPanel = state.schema.panels.controls;

  React.useEffect(() => {
    const controlTypes = new Set<string>();
    for (const section of controlsPanel?.sections ?? []) {
      for (const control of Object.values(section.controls)) {
        controlTypes.add(control.type);
        if (control.itemControl) controlTypes.add(control.itemControl.type);
      }
    }
    preloadControlsPanelRenderers(controlTypes);
  }, [controlsPanel]);
  const keyframedControlIds = React.useMemo(
    () => new Set(state.timeline.keyframeGroups.map((group) => group.controlId)),
    [state.timeline.keyframeGroups],
  );
  const keyframeControlsEnabled = Boolean(
    state.schema.assembly.capabilities.includes("timeline.keyframes"),
  );

  React.useEffect(() => {
    setCollapsedSectionByKey(readControlsPanelCollapsedSections(sectionCollapseStorageKey));
  }, [sectionCollapseStorageKey]);

  if (!controlsPanel) {
    return null;
  }

  const resolvedControlsPanel = controlsPanel;
  const placement = panelPlacement ?? (framed ? "frame" : "surface");
  const controlsResetKey = getControlsResetKey(state);

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
    return getToolcraftTargetValue(store.getState(), control.target) ?? control.defaultValue;
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
    const visibleEntries: ControlEntry[] = [];

    for (const entry of Object.entries(section.controls)) {
      if (isControlVisible(entry[1])) {
        visibleEntries.push(entry);
      }
    }

    return visibleEntries;
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

  const visibleSections: Array<{
    entries: ControlEntry[];
    section: ToolcraftControlSectionSchema;
  }> = [];

  for (const section of resolvedControlsPanel.sections) {
    const entries = getVisibleSectionEntries(section);

    if (isSectionVisible(section) && entries.length > 0) {
      visibleSections.push({ entries, section });
    }
  }
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
      contentRenderer={(children, viewportElement) => (
        <ControlsPanelDelegatedTooltip>
          <ControlsPanelVirtualContent viewportElement={viewportElement}>
            {children}
          </ControlsPanelVirtualContent>
        </ControlsPanelDelegatedTooltip>
      )}
      onResetControls={() => dispatchCommand({ type: "controls.reset" })}
      stickyFooterActive={stickyFooterActive}
      stickyFooterProgress={stickyFooterProgress}
      title={resolvedControlsPanel.title}
    >
      {visibleSections.map(({ entries, section }, sectionIndex) => {
        const panelSectionKey = `${section.title ?? "section"}-${sectionIndex}`;
        return (
          <ControlsPanelSectionValueSubscription
            key={panelSectionKey}
            targets={entries.map(([, control]) => control.target)}
            render={() => renderControlsPanelSection({
              collapsedSectionByKey,
              controlRenderers,
              dispatch,
              dispatchCommand,
              entries,
              getControlValue,
              isControlDisabled,
              keyframeActions,
              onSectionCollapsedChange: handleSectionCollapsedChange,
              panelSectionKey,
              runAction,
              section,
              sectionIndex,
              setControlValue,
              state,
              vectorPadShape,
            })}
          />
        );
      })}
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
