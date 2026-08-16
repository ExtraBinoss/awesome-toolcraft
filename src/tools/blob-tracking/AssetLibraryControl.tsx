"use client";

import * as React from "react";
import { AssetLibrary, useToolcraftDispatch, useToolcraftSelector, useToolcraftStore, useToolcraftValues, type ToolcraftCustomControlRendererProps } from "@/toolcraft/runtime/react";
import { createToolcraftPngExportCanvas, getToolcraftVideoExportSize, ToolcraftCanvasRecorder, downloadToolcraftVideo } from "@/toolcraft/runtime";
import type { ToolcraftAssetLibrarySource } from "@/toolcraft/runtime/schema/types";
import { readImportedFile } from "@/toolcraft/runtime/react/canvas/media-file";
import type { ToolcraftMediaAsset } from "@/toolcraft/runtime/state/types";

const blobLibrary = [
  { alt: "Gnou", kind: "image", src: "/baseAssets/images/gnou.jpg", value: "gnou" },
  { alt: "Clione", kind: "image", src: "/baseAssets/images/Clione.jpg", value: "clione" },
  { alt: "Papillon monarque", kind: "image", src: "/baseAssets/images/papillon_monarque.jpg", value: "papillon" },
  { alt: "Jellyfish", kind: "video", src: "/baseAssets/videos/jellyfish.webm", value: "jellyfish" },
  { alt: "Cat candle", kind: "video", src: "/baseAssets/videos/cat_candle.webm", value: "cat-candle" },
  { alt: "Pinguin", kind: "video", src: "/baseAssets/videos/pinguin.webm", value: "pinguin" },
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

export function BlobExportControls(): React.JSX.Element {
  const store = useToolcraftStore();
  const values = useToolcraftValues(["blob.background", "export.image.format", "export.image.resolution", "export.includeBackground", "export.video.resolution"]);
  const [recording, setRecording] = React.useState(false); const [message, setMessage] = React.useState("");
  const recorderRef = React.useRef<ToolcraftCanvasRecorder | null>(null); const animationRef = React.useRef(0);
  const preview = () => document.querySelector<HTMLCanvasElement>("[data-toolcraft-composite-canvas='true']");
  const imageExport = async (): Promise<void> => {
    store.syncPlayhead();
    const state = store.getState();
    const source = preview(); if (!source) { setMessage("Preview is not ready."); return; }
    const includeBackground = state.values["export.includeBackground"] !== false;
    const canvas = createToolcraftPngExportCanvas({ background: String(state.values["blob.background"] ?? "#000000"), includeBackground, resolution: String(state.values["export.image.resolution"] ?? "4k"), state, render: ({ context, cssWidth, cssHeight }) => context.drawImage(source, 0, 0, cssWidth, cssHeight) });
    const format = String(state.values["export.image.format"] ?? "png"); const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image export failed.")), format === "jpg" ? "image/jpeg" : "image/png", .96));
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `blob-tracking.${format === "jpg" ? "jpg" : "png"}`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const stop = async (): Promise<void> => {
    cancelAnimationFrame(animationRef.current); const recorder = recorderRef.current; recorderRef.current = null; setRecording(false);
    if (!recorder) return;
    try { downloadToolcraftVideo(await recorder.stop(), "blob-tracking.webm"); setMessage("Recording downloaded."); } catch (error) { setMessage(error instanceof Error ? error.message : "Recording failed."); }
  };
  const start = (): void => {
    store.syncPlayhead();
    const state = store.getState();
    try {
      const source = preview(); if (!source) throw new Error("Preview is not ready.");
      const size = getToolcraftVideoExportSize({ resolution: String(state.values["export.video.resolution"] ?? "current"), state }); const canvas = document.createElement("canvas"); canvas.width = size.width; canvas.height = size.height; const context = canvas.getContext("2d"); if (!context) throw new Error("Export canvas is unavailable.");
      const recorder = new ToolcraftCanvasRecorder({ canvas, frameRate: 30 }); recorderRef.current = recorder; recorder.start(); setRecording(true); setMessage("");
      const copy = () => { context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(source, 0, 0, canvas.width, canvas.height); if (recorderRef.current === recorder) animationRef.current = requestAnimationFrame(copy); }; copy();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Recording is unavailable."); }
  };
  React.useEffect(() => () => { if (recorderRef.current) void stop(); cancelAnimationFrame(animationRef.current); }, []);
  return <div className="space-y-2"><div className="grid grid-cols-2 gap-1.5"><button className="rounded-md border border-[color:color-mix(in_oklab,var(--border)_20%,transparent)] px-2 py-1.5 text-xs hover:border-[color:var(--border)]" onClick={() => void imageExport()} type="button">Export {String(values["export.image.format"] ?? "PNG").toUpperCase()}</button><button className={`rounded-md border px-2 py-1.5 text-xs ${recording ? "border-red-400 bg-red-400/15 text-red-200" : "border-[color:color-mix(in_oklab,var(--border)_20%,transparent)]"}`} onClick={() => recording ? void stop() : start()} type="button">{recording ? "Stop recording" : "Start recording"}</button></div>{message ? <p className="text-[11px] text-[color:var(--muted-foreground)]">{message}</p> : null}</div>;
}

AssetLibraryControl.library = blobLibrary;
