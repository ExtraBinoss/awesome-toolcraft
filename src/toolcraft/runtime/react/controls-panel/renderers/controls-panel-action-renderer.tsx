"use client";

import * as React from "react";
import {
  Actions,
  PanelActions,
  type PanelActionObjectOption,
} from "@/toolcraft/ui";

import type {
  ToolcraftActionSchema,
  ToolcraftControlSchema,
} from "../../../schema/types";

export type ActionControlRunAction = (
  action: ToolcraftActionSchema,
  options?: { trackFooterPending?: boolean },
) => void;

export type ActionControlRenderArgs = {
  control: ToolcraftControlSchema;
  id: string;
  name: string;
  runAction: ActionControlRunAction;
};

function getPanelActionButtonVariant(
  variant: ToolcraftActionSchema["variant"],
): PanelActionObjectOption["variant"] {
  switch (variant) {
    case "destructive":
    case "ghost":
    case "link":
    case "outline":
    case "secondary":
      return variant;
    default:
      return "default";
  }
}

function asActionSchemas(
  actions: readonly (ToolcraftActionSchema | string)[] | undefined,
): readonly ToolcraftActionSchema[] {
  return (actions ?? []).map((action) =>
    typeof action === "string"
      ? {
          label: action,
          value: action,
        }
      : action,
  );
}

function getActionLabel(action: ToolcraftActionSchema): string {
  return action.label ?? action.value;
}

function isExportPanelAction(action: ToolcraftActionSchema): boolean {
  if (action.role === "export-image" || action.role === "export-video") {
    return true;
  }

  const label = getActionLabel(action);
  const value = action.value;

  return (
    /\bexport\b/i.test(label) ||
    /(?:^|[._:-])export(?:[._:-]|$)/i.test(value) ||
    /^export(?:[._:-]|$)/i.test(value)
  );
}

function getPanelActionIcon(
  action: ToolcraftActionSchema,
): PanelActionObjectOption["icon"] {
  return isExportPanelAction(action) ? "upload-simple" : action.icon;
}

export function renderActionControl({
  control,
  id,
  name,
  runAction,
}: ActionControlRenderArgs): React.ReactNode | null {
  switch (control.type) {
    case "actions": {
      const actions = asActionSchemas(control.actions);

      return (
        <Actions
          actions={actions.map((action) => ({
            icon: action.icon,
            label: action.label,
            value: action.value,
          }))}
          key={id}
          name={name}
          onAction={(actionValue) => {
            const action = actions.find((item) => item.value === actionValue);

            if (action) {
              runAction(action);
            }
          }}
          showLabel={control.label !== false}
        />
      );
    }

    case "panelActions": {
      const actions = asActionSchemas(control.actions);

      return (
        <PanelActions
          actions={actions.map((action) => ({
            icon: getPanelActionIcon(action),
            name: getActionLabel(action),
            value: action.value,
            variant: getPanelActionButtonVariant(action.variant),
          }))}
          key={id}
          onAction={(actionValue) => {
            const action = actions.find((item) => item.value === actionValue);

            if (action) {
              runAction(action, { trackFooterPending: true });
            }
          }}
        />
      );
    }

    default:
      return null;
  }
}
