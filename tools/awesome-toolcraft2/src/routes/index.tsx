import { ToolcraftApp } from "@/toolcraft/runtime/react";

import { appComposition } from "../app/app-composition";

export function AppHome(): React.JSX.Element {
  return (
    <ToolcraftApp
      canvasContent={appComposition.canvasContent}
      className="h-dvh min-h-dvh"
      controlRenderers={appComposition.controlRenderers}
      onPanelAction={appComposition.onPanelAction}
      renderDefaultCanvasMedia={appComposition.renderDefaultCanvasMedia}
      schema={appComposition.schema}
    />
  );
}
