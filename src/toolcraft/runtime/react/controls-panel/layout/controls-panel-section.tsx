"use client";

import * as React from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import {
  Button,
  PanelSection,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type ControlChangeMeta,
} from "@/toolcraft/ui";

import type {
  ToolcraftControlSectionSchema,
  ToolcraftControlSchema,
} from "../../../schema/types";
import type {
  ToolcraftCommand,
  ToolcraftState,
} from "../../../state/types";
import type { ToolcraftControlRendererMap } from "../control-renderers";
import type { ActionControlRunAction } from "../renderers/controls-panel-action-renderer";
import { renderActionControl } from "../renderers/controls-panel-action-renderer";
import { renderBasicControl } from "../renderers/controls-panel-basic-renderers";
import { renderCollectionActionsControl } from "../renderers/controls-panel-collection-renderer";
import {
  renderCompoundColorGroup,
  renderCompoundControl,
} from "../renderers/controls-panel-compound-renderers";
import { withControlLabelHelp } from "./controls-panel-help";
import type { ControlsPanelKeyframeActions } from "../keyframes/controls-panel-keyframes";
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
import { renderFileDropControl } from "../renderers/controls-panel-media-renderer";
import { renderSettingsTransferControl } from "../renderers/controls-panel-settings-transfer-renderer";
import { getToolcraftControlRendererKind } from "../renderers/controls-panel-renderer-registry";
import {
  getInlineLayoutGroupByControlId,
  renderControlLayoutGroups,
  shouldHideToggleParameterControlLabel,
} from "./controls-panel-inline-layout";
import { getControlsPanelSectionCollapseKey } from "./controls-panel-collapse-storage";

export type ControlsPanelSetControlValue = (
  target: string,
  value: unknown,
  label?: string,
  meta?: ControlChangeMeta,
) => void;

export type ControlsPanelSectionProps = {
  collapsedSectionByKey: Record<string, boolean>;
  controlRenderers?: ToolcraftControlRendererMap;
  dispatch: React.Dispatch<ToolcraftCommand>;
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
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            data-control-section-reset-button=""
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
          />
        }
      >
        <ArrowCounterClockwiseIcon />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
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
                node: renderCompoundColorGroup({
                  entries: group.entries,
                  getControlName,
                  getControlValue,
                  headerKeyframeTarget,
                  maybeUpsertControlKeyframe,
                  sectionHasOnlyColorFields,
                  setControlValue,
                  shouldShowColorFieldLabel,
                  withKeyframeLabelAction,
                }),
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
                return renderActionControl({
                  control,
                  id,
                  name,
                  runAction,
                });

              case "basic":
                return renderBasicControl({
                  commit,
                  control,
                  id,
                  name,
                  usesHeaderKeyframeAction,
                  value,
                  vectorPadShape,
                  withKeyframeLabelAction,
                });

              case "compound":
                return renderCompoundControl({
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
                });

              case "collection":
                return renderCollectionActionsControl({
                  control,
                  name,
                  setControlValue,
                  value,
                });

              case "media":
                return renderFileDropControl({
                  canvasSize: state.canvas.size,
                  control,
                  dispatchCommand,
                  id,
                  mediaAssets: state.schema.panels.layers ? [] : state.mediaAssets,
                });

              case "settings":
                return renderSettingsTransferControl({
                  dispatch,
                  id,
                  state,
                });

              case null: {
                const CustomControl = controlRenderers?.[control.type];

                if (!CustomControl) {
                  return null;
                }

                return withKeyframeLabelAction({
                  children: (
                    <React.Fragment key={id}>
                      {CustomControl({
                        control,
                        controlId: id,
                        dispatch,
                        keyframeAction: getKeyframeLabelAction(control, name, value),
                        name,
                        setValue: commit,
                        state,
                        value,
                      })}
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
                children: withControlLabelHelp({
                  children: node,
                  control,
                  label: name,
                  providerKey: id,
                  sectionTitle: section.title,
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
