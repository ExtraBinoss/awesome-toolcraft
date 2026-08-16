import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react/app-shell/toolcraft-app";
import { AssetLibraryControl, BlobExportControls } from "./AssetLibraryControl";
import { BlobTrackingRenderer } from "./blob-tracking-renderer";
import { appSchema } from "./app-schema";

export const appComposition: ToolcraftAppComposition = {
  schema: appSchema,
  canvasContent: <BlobTrackingRenderer library={AssetLibraryControl.library} />,
  controlRenderers: { assetLibrary: AssetLibraryControl, blobExport: BlobExportControls },
  renderDefaultCanvasMedia: false,
};
