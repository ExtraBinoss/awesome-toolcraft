import * as React from "react";

import { createToolcraftPngExportCanvas, getToolcraftVideoExportSize, ToolcraftCanvasRecorder, downloadToolcraftVideo } from "@/toolcraft/runtime";
import { useToolcraftStore, type ToolcraftCustomControlRendererProps } from "@/toolcraft/runtime/react";
import { Button } from "@/toolcraft/ui";

function outputCanvas(): HTMLCanvasElement | null {
  return document.querySelector<HTMLCanvasElement>("[data-toolcraft-dither-heatmap-canvas='true']");
}

export function DitherHeatmapExportControl(_props: ToolcraftCustomControlRendererProps): React.JSX.Element {
  const store = useToolcraftStore();
  const [recording, setRecording] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const recorderRef = React.useRef<ToolcraftCanvasRecorder | null>(null);
  const animationRef = React.useRef(0);

  const exportImage = async (): Promise<void> => {
    store.syncPlayhead();
    const state = store.getState();
    const source = outputCanvas();
    if (!source) { setMessage("Preview is not ready."); return; }
    const includeBackground = state.values["export.includeBackground"] !== false;
    const background = String(state.values["appearance.background"] ?? "#0D0D11");
    const resolution = String(state.values["export.image.resolution"] ?? "2k");
    const canvas = createToolcraftPngExportCanvas({ state, includeBackground, background, resolution, render: ({ context, cssWidth, cssHeight }) => context.drawImage(source, 0, 0, cssWidth, cssHeight) });
    const format = String(state.values["export.image.format"] ?? "png");
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image export failed.")), format === "jpg" ? "image/jpeg" : "image/png", .96));
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `dither-heatmap.${format === "jpg" ? "jpg" : "png"}`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const stopRecording = async (): Promise<void> => {
    cancelAnimationFrame(animationRef.current);
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);
    if (!recorder) return;
    try { downloadToolcraftVideo(await recorder.stop(), "dither-heatmap.webm"); setMessage("Recording downloaded."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Recording failed."); }
  };

  const startRecording = (): void => {
    store.syncPlayhead();
    const state = store.getState();
    try {
      const source = outputCanvas();
      if (!source) throw new Error("Preview is not ready.");
      const size = getToolcraftVideoExportSize({ resolution: String(state.values["export.video.resolution"] ?? "current"), state });
      const canvas = document.createElement("canvas"); canvas.width = size.width; canvas.height = size.height;
      const context = canvas.getContext("2d"); if (!context) throw new Error("Export canvas is unavailable.");
      const recorder = new ToolcraftCanvasRecorder({ canvas, frameRate: 30 }); recorderRef.current = recorder; recorder.start(); setRecording(true); setMessage("");
      const copy = () => { context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(source, 0, 0, canvas.width, canvas.height); if (recorderRef.current === recorder) animationRef.current = requestAnimationFrame(copy); };
      copy();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Recording is unavailable."); }
  };

  React.useEffect(() => () => { cancelAnimationFrame(animationRef.current); if (recorderRef.current) void recorderRef.current.stop(); }, []);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <Button onClick={() => void exportImage()} size="sm" type="button">Export image</Button>
        <Button onClick={() => recording ? void stopRecording() : startRecording()} size="sm" type="button" variant={recording ? "destructive-outline" : "outline"}>{recording ? "Stop recording" : "Record video"}</Button>
      </div>
      {message ? <p className="text-[11px] text-[color:var(--muted-foreground)]">{message}</p> : null}
    </div>
  );
}
