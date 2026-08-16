"use client";

import * as React from "react";
import { PanelActions } from "@/toolcraft/ui/components/panel/panel-actions";

import {
  downloadToolcraftSettings,
  importToolcraftSettings,
} from "../../app-shell/settings-transfer";
import {
  useToolcraftDispatch,
  useToolcraftStore,
} from "../../app-shell/use-toolcraft";

export type SettingsTransferControlRenderArgs = {
  id: string;
};

function SettingsTransferControl(): React.JSX.Element {
  const dispatch = useToolcraftDispatch();
  const store = useToolcraftStore();

  return (
    <PanelActions
      actions={[
        {
          icon: "upload-simple",
          name: "Export Settings",
          onClick: () => {
            store.syncPlayhead();
            downloadToolcraftSettings(store.getState());
          },
          variant: "outline",
        },
        {
          icon: "download-simple",
          name: "Import Settings",
          onClick: () => {
            store.syncPlayhead();
            void importToolcraftSettings({ dispatch, state: store.getState() });
          },
          variant: "outline",
        },
      ]}
      columns={2}
    />
  );
}

export function renderSettingsTransferControl({
  id,
}: SettingsTransferControlRenderArgs): React.ReactNode {
  return <SettingsTransferControl key={id} />;
}
