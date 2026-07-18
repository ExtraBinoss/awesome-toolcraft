import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";
import { AssetLibraryControl, blobLibrary, BlobExportControls } from "./AssetLibraryControl";
import { BlobTrackingRenderer } from "./blob-tracking-renderer";
import { appSchema } from "./app-schema";

export const appComposition: ToolcraftAppComposition = {
  schema: appSchema,
  canvasContent: <BlobTrackingRenderer library={blobLibrary} />,
  controlRenderers: { assetLibrary: AssetLibraryControl, blobExport: BlobExportControls },
  renderDefaultCanvasMedia: false,
};
