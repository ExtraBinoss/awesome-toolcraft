import { ToolcraftApp } from "@/toolcraft/runtime/react";

import { appComposition } from "./app-composition";

export function AuroraGeneratorPage() {
  return <ToolcraftApp canvasContent={appComposition.canvasContent} className="h-dvh min-h-dvh" onPanelAction={appComposition.onPanelAction} renderDefaultCanvasMedia={false} schema={appComposition.schema} />;
}
