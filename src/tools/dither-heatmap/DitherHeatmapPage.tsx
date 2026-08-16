import { useEffect } from "react";

import { ToolcraftApp } from "@/toolcraft/runtime/react/app-shell/toolcraft-app";
import { logToolLoad, printToolLoadSummary } from "@/tool-load-debug";

import { appComposition } from "./app-composition";

export function DitherHeatmapPage(): React.JSX.Element {
  useEffect(() => {
    logToolLoad("page:mounted dither-heatmap");
    printToolLoadSummary();
  }, []);

  return (
    <ToolcraftApp
      canvasContent={appComposition.canvasContent}
      className="h-dvh min-h-dvh"
      controlRenderers={appComposition.controlRenderers}
      onPanelAction={appComposition.onPanelAction}
      renderDefaultCanvasMedia={false}
      schema={appComposition.schema}
    />
  );
}
