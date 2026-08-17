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

export function SettingsTransferControl(): React.JSX.Element {
  const dispatch = useToolcraftDispatch();
  const store = useToolcraftStore();

  return (
    <PanelActions
      actions={[
        {
          className: "min-w-0 gap-1.5 px-2 text-[11px] tracking-tight",
          children: "Export",
          icon: "download-simple",
          name: "Export Settings",
          onClick: () => {
            store.syncPlayhead();
            downloadToolcraftSettings(store.getState());
          },
          variant: "outline",
        },
        {
          className: "min-w-0 gap-1.5 px-2 text-[11px] tracking-tight",
          children: "Import",
          icon: "upload-simple",
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
