"use client";

import * as React from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@/toolcraft/ui/components/primitives/button";
import { PanelSection } from "@/toolcraft/ui/components/panel/panel-section";
import type { ControlChangeMeta } from "@/toolcraft/ui/components/controls/control-types";
import { ControlFieldLabelResetProvider } from "@/toolcraft/ui/components/control-layout";

import type {
  ToolcraftControlSectionSchema,
  ToolcraftControlSchema,
} from "../../../schema/types";
import type {
  ToolcraftCommand,
  ToolcraftState,
} from "../../../state/types";
import type { ToolcraftDispatch } from "../../../state/store";
import type { ToolcraftControlRendererMap } from "../control-renderers";
import type { ActionControlRunAction } from "../renderers/controls-panel-action-renderer";
import { withControlLabelHelp } from "./controls-panel-help";
import type { ControlsPanelKeyframeActions } from "../keyframes/controls-panel-keyframes";
import { ActionControlRenderer } from "../renderers/controls-panel-action-renderer";
import { BasicControlRenderer } from "../renderers/controls-panel-basic-renderers";
import { CollectionActionsControlRenderer } from "../renderers/controls-panel-collection-renderer";
import { CompoundRenderer } from "../renderers/controls-panel-compound-renderers";
import { preloadCompoundControlRenderers } from "../renderers/controls-panel-heavy-renderer-loaders";
import { SettingsTransferControl } from "../renderers/controls-panel-settings-transfer-renderer";

const loadMediaRenderer = () => import("../renderers/controls-panel-media-renderer");
const loadExportRenderer = () => import("../renderers/controls-panel-export-renderer");
const LazyFileDropControl = React.lazy(() =>
  loadMediaRenderer().then((module) => ({
    default: module.FileDropControlRenderer,
  })),
);
const LazyExportControl = React.lazy(() =>
  loadExportRenderer().then((module) => ({
    default: module.ToolcraftExportControlRenderer,
  })),
);
import {
  type ControlEntry,
  getControlName,
  getControlRenderGroupIds,
  getControlRenderGroups,
  getControlsRecord,
  getRenderedControlsSectionTitle,
  isColorOnlySection,
  isRuntimeSetupSection,
  shouldShowColorFieldLabel,
  withCompoundControlSectionDivider,
} from "./controls-panel-layout";
import { getToolcraftControlRendererKind } from "../renderers/controls-panel-renderer-registry";
import {
  getInlineLayoutGroupByControlId,
  renderControlLayoutGroups,
  shouldHideToggleParameterControlLabel,
} from "./controls-panel-inline-layout";
import { getControlsPanelSectionCollapseKey } from "./controls-panel-collapse-storage";

export function preloadControlsPanelRenderers(controlTypes: ReadonlySet<string>): void {
  const imports: Promise<unknown>[] = [preloadCompoundControlRenderers(controlTypes)];
  if (controlTypes.has("fileDrop")) imports.push(loadMediaRenderer());
  if (controlTypes.has("export")) imports.push(loadExportRenderer());
  void Promise.all(imports);
}

export type ControlsPanelSetControlValue = (
  target: string,
  value: unknown,
  label?: string,
  meta?: ControlChangeMeta,
) => void;

function ControlRendererLoading({
  size = "field",
}: {
  size?: "compact" | "field" | "large";
}): React.JSX.Element {
  return (
    <div
      aria-label="Loading control"
      className="toolcraft-control-inline-loading"
      data-size={size}
      role="status"
    >
      <span aria-hidden="true" />
    </div>
  );
}

export type ControlsPanelSectionProps = {
  collapsedSectionByKey: Record<string, boolean>;
  controlRenderers?: ToolcraftControlRendererMap;
  dispatch: ToolcraftDispatch;
  dispatchCommand: (command: ToolcraftCommand) => void;
  entries: readonly ControlEntry[];
  getControlValue: (control: ToolcraftControlSchema) => unknown;
  isControlDisabled: (control: ToolcraftControlSchema) => boolean;
  keyframeActions: ControlsPanelKeyframeActions;
  onSectionCollapsedChange: (
    sectionCollapseKey: string,
    collapsed: boolean,
  ) => void;
  panelSectionKey: React.Key;
  runAction: ActionControlRunAction;
  section: ToolcraftControlSectionSchema;
  sectionIndex: number;
  setControlValue: ControlsPanelSetControlValue;
  state: ToolcraftState;
  vectorPadShape: "compact" | "square";
};

function getSectionResetAction({
  dispatchCommand,
  sectionTitle,
  targets,
}: {
  dispatchCommand: (command: ToolcraftCommand) => void;
  sectionTitle: string;
  targets: readonly string[];
}): React.ReactNode {
  const label = `Reset ${sectionTitle} section`;

  return (
          <Button
            aria-label={label}
            data-control-section-reset-button=""
            data-toolcraft-tooltip={label}
            onClick={() => {
              dispatchCommand({
                label,
                targets: Array.from(new Set(targets)),
                type: "controls.resetTargets",
              });
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
        <ArrowCounterClockwiseIcon />
          </Button>
  );
}

function withControlTargetBoundary({
  controlIds,
  node,
  targets,
}: {
  controlIds: readonly string[];
  node: React.ReactNode;
  targets: readonly string[];
}): React.ReactNode {
  const uniqueControlIds = [...new Set(controlIds)];
  const uniqueTargets = [...new Set(targets)];

  return (
    <div
      className="contents"
      data-toolcraft-control-id={
        uniqueControlIds.length === 1 ? uniqueControlIds[0] : undefined
      }
      data-toolcraft-control-ids={
        uniqueControlIds.length > 1 ? JSON.stringify(uniqueControlIds) : undefined
      }
      data-toolcraft-control-target={
        uniqueTargets.length === 1 ? uniqueTargets[0] : undefined
      }
      data-toolcraft-control-targets={
        uniqueTargets.length > 1 ? JSON.stringify(uniqueTargets) : undefined
      }
      key={`control-target-boundary:${uniqueControlIds.join("|")}`}
    >
      {node}
    </div>
  );
}

function withControlLabelReset({
  children,
  control,
  dispatchCommand,
  label,
}: {
  children: React.ReactNode;
  control: ToolcraftControlSchema;
  dispatchCommand: (command: ToolcraftCommand) => void;
  label: string;
}): React.ReactNode {
  return (
    <ControlFieldLabelResetProvider
      label={label}
      reset={() => dispatchCommand({
        label: `Reset ${label}`,
        targets: [control.target],
        type: "controls.resetTargets",
      })}
    >
      {children}
    </ControlFieldLabelResetProvider>
  );
}

export function renderControlsPanelSection({
  collapsedSectionByKey,
  controlRenderers,
  dispatch,
  dispatchCommand,
  entries,
  getControlValue,
  isControlDisabled,
  keyframeActions,
  onSectionCollapsedChange,
  panelSectionKey,
  runAction,
  section,
  sectionIndex,
  setControlValue,
  state,
  vectorPadShape,
}: ControlsPanelSectionProps): React.JSX.Element {
  const {
    getKeyframeLabelAction,
    getSectionHeaderKeyframeAction,
    getSectionHeaderKeyframeEntry,
    maybeUpsertControlKeyframe,
    withKeyframeLabelAction,
  } = keyframeActions;
  const visibleControls = getControlsRecord(entries);
  const sectionHasOnlyColorFields = isColorOnlySection(entries);
  const isRuntimeSetup = isRuntimeSetupSection({ entries, section });
  const renderedSectionTitle = isRuntimeSetup
    ? undefined
    : getRenderedControlsSectionTitle(section);
  const sectionSpacing = "default";
  const sectionCollapseKey = getControlsPanelSectionCollapseKey({
    entries,
    section,
    sectionIndex,
  });
  const isSectionCollapsible = !isRuntimeSetup && renderedSectionTitle !== undefined;
  const isSectionCollapsed =
    isSectionCollapsible && collapsedSectionByKey[sectionCollapseKey] === true;
  const headerKeyframeEntry = getSectionHeaderKeyframeEntry(entries, section.title);
  const headerKeyframeTarget = headerKeyframeEntry?.[1].target ?? null;
  const headerKeyframeAction = headerKeyframeEntry
    ? getSectionHeaderKeyframeAction(headerKeyframeEntry)
    : null;
  const sectionResetAction = isSectionCollapsible
    ? getSectionResetAction({
        dispatchCommand,
        sectionTitle:
          typeof renderedSectionTitle === "string" ? renderedSectionTitle : "section",
        targets: entries.map(([, control]) => control.target),
      })
    : null;
  const sectionHeaderAction =
    headerKeyframeAction || sectionResetAction ? (
      <>
        {headerKeyframeAction}
        {sectionResetAction}
      </>
    ) : undefined;
  const inlineLayoutGroupByControlId = getInlineLayoutGroupByControlId({
    controlsById: visibleControls,
    layoutGroups: section.layoutGroups,
  });

  return (
    <PanelSection
      action={sectionHeaderAction}
      actionGroup={section.actionGroup}
      allowCompoundDividers={entries.length > 1}
      collapsed={isSectionCollapsed}
      collapsible={isSectionCollapsible}
      key={panelSectionKey}
      onCollapsedChange={(collapsed) => {
        onSectionCollapsedChange(sectionCollapseKey, collapsed);
      }}
      spacing={sectionSpacing}
      title={renderedSectionTitle}
    >
      {renderControlLayoutGroups({
        controlsById: visibleControls,
        layoutGroups: section.layoutGroups,
        renderedGroups: getControlRenderGroups(entries).map((group) => {
          const ids = getControlRenderGroupIds(group);

          if (group.kind === "colorGroup") {
            return {
              ids,
              node: withControlTargetBoundary({
                controlIds: ids,
                node: (
                    <CompoundRenderer
                      kind="colorGroup"
                      args={{
                        entries: group.entries,
                        getControlName,
                        getControlValue,
                        headerKeyframeTarget,
                        maybeUpsertControlKeyframe,
                        sectionHasOnlyColorFields,
                        setControlValue,
                        shouldShowColorFieldLabel,
                        withKeyframeLabelAction,
                      }}
                    />
                ),
                targets: group.entries.map(([, control]) => control.target),
              }),
            };
          }

          const [id, rawControl] = group.entry;
          const inlineLayoutGroup = inlineLayoutGroupByControlId.get(id);
          const disabled = isControlDisabled(rawControl);
          const resolvedControl =
            disabled === Boolean(rawControl.disabled)
              ? rawControl
              : { ...rawControl, disabled };
          const shouldHideLabel = shouldHideToggleParameterControlLabel({
            control: resolvedControl,
            controlsById: visibleControls,
            layoutGroup: inlineLayoutGroup,
          });
          const control =
            shouldHideLabel && resolvedControl.label !== false
              ? { ...resolvedControl, label: false }
              : resolvedControl;
          const name = getControlName(id, resolvedControl.label);
          const value = getControlValue(control);
          const usesHeaderKeyframeAction = control.target === headerKeyframeTarget;
          const commitWithLabel =
            (label: string) =>
            (nextValue: unknown, meta?: ControlChangeMeta): void => {
              setControlValue(control.target, nextValue, label, meta);
              maybeUpsertControlKeyframe(control, label, nextValue);
            };
          const commit = commitWithLabel(name);
          const node = (() => {
            switch (getToolcraftControlRendererKind(control.type)) {
              case "action":
                return (
                    <ActionControlRenderer
                      control={control}
                      id={id}
                      name={name}
                      runAction={runAction}
                    />
                );

              case "basic":
                return (
                    <BasicControlRenderer
                      commit={commit}
                      control={control}
                      id={id}
                      name={name}
                      usesHeaderKeyframeAction={usesHeaderKeyframeAction}
                      value={value}
                      vectorPadShape={vectorPadShape}
                      withKeyframeLabelAction={withKeyframeLabelAction}
                    />
                );

              case "compound":
                return (
                    <CompoundRenderer
                      kind="control"
                      args={{
                        commit,
                        commitWithLabel,
                        control,
                        id,
                        name,
                        sectionHasOnlyColorFields,
                        shouldShowColorFieldLabel,
                        usesHeaderKeyframeAction,
                        value,
                        withKeyframeLabelAction,
                      }}
                    />
                );

              case "collection":
                return (
                    <CollectionActionsControlRenderer
                      control={control}
                      name={name}
                      setControlValue={setControlValue}
                      value={value}
                    />
                );

              case "media":
                return (
                  <React.Suspense fallback={<ControlRendererLoading size="large" />}>
                    <LazyFileDropControl
                      canvasSize={state.canvas.size}
                      control={control}
                      dispatchCommand={dispatchCommand}
                      id={id}
                      mediaAssets={state.schema.panels.layers ? [] : state.mediaAssets}
                    />
                  </React.Suspense>
                );

              case "export":
                return (
                  <React.Suspense fallback={<ControlRendererLoading size="large" />}>
                    <LazyExportControl control={control} />
                  </React.Suspense>
                );

              case "settings":
                return (
                  <SettingsTransferControl key={id} />
                );

              case null: {
                const CustomControl = controlRenderers?.[control.type];

                if (!CustomControl) {
                  return null;
                }

                return withKeyframeLabelAction({
                  children: (
                    <React.Fragment key={id}>
                      <React.Suspense fallback={<ControlRendererLoading />}>
                        <CustomControl
                          control={control}
                          controlId={id}
                          dispatch={dispatch}
                          keyframeAction={getKeyframeLabelAction(control, name, value)}
                          name={name}
                          setValue={commit}
                          value={value}
                        />
                      </React.Suspense>
                    </React.Fragment>
                  ),
                  control,
                  disableAction: usesHeaderKeyframeAction,
                  name,
                  providerKey: id,
                  value,
                });
              }
            }
          })();

          return {
            ids,
            node: withControlTargetBoundary({
              controlIds: ids,
              node: withCompoundControlSectionDivider({
                children: withControlLabelReset({
                  children: withControlLabelHelp({
                    children: node,
                    control,
                    label: name,
                    providerKey: id,
                    sectionTitle: section.title,
                  }),
                  control,
                  dispatchCommand,
                  label: name,
                }),
                control,
              }),
              targets: [control.target],
            }),
          };
        }),
      })}
    </PanelSection>
  );
}
