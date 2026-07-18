import { ToolcraftApp } from "@/toolcraft/runtime/react";
import { appComposition } from "./app-composition";

export function BlobTrackingPage(): React.JSX.Element {
  return <ToolcraftApp canvasContent={appComposition.canvasContent} className="h-dvh min-h-dvh" controlRenderers={appComposition.controlRenderers} renderDefaultCanvasMedia={false} schema={appComposition.schema} />;
}
