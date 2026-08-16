import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react/app-shell/toolcraft-app";

import { appSchema } from "./app-schema";
import { Artistic3DExportControl } from "./artistic-3d-export-control";
import { Artistic3DRenderer } from "./artistic-3d-renderer";

export const appComposition: ToolcraftAppComposition = {
  schema: appSchema,
  canvasContent: <Artistic3DRenderer />,
  controlRenderers: { artistic3DExport: Artistic3DExportControl },
  renderDefaultCanvasMedia: false,
  onPanelAction: ({ action, dispatch, state }) => {
    if (action.value === "view.reset") {
      dispatch({ type: "controls.setValue", target: "view.resetNonce", value: Number(state.values["view.resetNonce"] ?? 0) + 1, label: "Reset rotation" });
    }
  },
};
