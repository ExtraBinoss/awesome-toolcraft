"use client";

import * as React from "react";
import { PanelActions } from "@/toolcraft/ui";

import type { ToolcraftCommand, ToolcraftState } from "../../../state/types";
import {
  downloadToolcraftSettings,
  importToolcraftSettings,
} from "../../app-shell/settings-transfer";

export type SettingsTransferControlRenderArgs = {
  dispatch: React.Dispatch<ToolcraftCommand>;
  id: string;
  state: ToolcraftState;
};

export function renderSettingsTransferControl({
  dispatch,
  id,
  state,
}: SettingsTransferControlRenderArgs): React.ReactNode {
  return (
    <PanelActions
      actions={[
        {
          icon: "upload-simple",
          name: "Export Settings",
          onClick: () => downloadToolcraftSettings(state),
          variant: "outline",
        },
        {
          icon: "download-simple",
          name: "Import Settings",
          onClick: () => {
            void importToolcraftSettings({ dispatch, state });
          },
          variant: "outline",
        },
      ]}
      key={id}
      columns={2}
    />
  );
}
