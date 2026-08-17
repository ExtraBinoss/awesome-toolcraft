"use client";

import * as React from "react";
import { withBasePath } from "@/base-path";
import {
  useToolcraftDispatch,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react/app-shell/use-toolcraft";
import { AssetLibrary } from "@/toolcraft/runtime/react/controls-panel/asset-library";
import type { ToolcraftCustomControlRendererProps } from "@/toolcraft/runtime/react/controls-panel/control-renderers";
import type { ToolcraftAssetLibrarySource } from "@/toolcraft/runtime/schema/types";
import { readImportedFile } from "@/toolcraft/runtime/react/canvas/media-file";
import type { ToolcraftMediaAsset } from "@/toolcraft/runtime/state/types";

const blobLibrary = [
  { alt: "Gnou", kind: "image", src: withBasePath("/baseAssets/images/gnou.jpg"), value: "gnou" },
  { alt: "Clione", kind: "image", src: withBasePath("/baseAssets/images/Clione.jpg"), value: "clione" },
  { alt: "Papillon monarque", kind: "image", src: withBasePath("/baseAssets/images/papillon_monarque.jpg"), value: "papillon" },
  { alt: "Jellyfish", kind: "video", src: withBasePath("/baseAssets/videos/jellyfish.webm"), value: "jellyfish" },
  { alt: "Cat candle", kind: "video", src: withBasePath("/baseAssets/videos/cat_candle.webm"), value: "cat-candle" },
  { alt: "Pinguin", kind: "video", src: withBasePath("/baseAssets/videos/pinguin.webm"), value: "pinguin" },
] as const;

function sourceValue(value: unknown): ToolcraftAssetLibrarySource {
  if (value && typeof value === "object" && "kind" in value) return value as ToolcraftAssetLibrarySource;
  return { assetId: "jellyfish", kind: "library", mediaType: "video" };
}

function uploadPreview(asset: ToolcraftMediaAsset | undefined) {
  return asset ? { assetKind: "file" as const, fileName: asset.fileName, id: asset.id, src: asset.dataUrl } : undefined;
}

export function AssetLibraryControl({ setValue, value }: ToolcraftCustomControlRendererProps): React.JSX.Element {
  const source = sourceValue(value);
  const didMount = React.useRef(false);
  const mediaAssets = useToolcraftSelector(React.useCallback((state) => state.mediaAssets, []));
  const upload = mediaAssets.find((asset) => asset.sourceTarget === "blob.source");
  const dispatch = useToolcraftDispatch();
  React.useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      if (source.kind === "webcam") setValue({ assetId: "jellyfish", kind: "library", mediaType: "video" }, { history: "skip" });
    }
  }, []);

  const handleUpload = async (file: File): Promise<void> => {
    const data = await readImportedFile(file); if (!data) return;
    const mediaType = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(file.name) ? "image" : "video";
    const id = `blob-upload-${Date.now()}`;
    dispatch({ type: "media.import", replaceExisting: true, asset: { id, assetKind: mediaType === "image" ? "image" : "file", dataUrl: data.dataUrl, fileName: file.name, mimeType: file.type || "application/octet-stream", position: { x: 0, y: 0 }, sourceTarget: "blob.source" } });
    setValue({ assetId: id, kind: "upload", mediaType });
  };
  return <AssetLibrary items={blobLibrary} onUpload={handleUpload} onValueChange={setValue} uploadPreview={uploadPreview(upload)} onClearUpload={upload ? () => dispatch({ type: "media.delete", mediaId: upload.id }) : undefined} value={source} />;
}

AssetLibraryControl.library = blobLibrary;
