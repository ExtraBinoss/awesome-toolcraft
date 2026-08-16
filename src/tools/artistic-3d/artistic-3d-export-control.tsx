import * as React from "react";

import { getToolcraftVideoExportSize, ToolcraftCanvasRecorder, downloadToolcraftVideo } from "@/toolcraft/runtime";
import { useToolcraftStore, type ToolcraftCustomControlRendererProps } from "@/toolcraft/runtime/react";
import { Button } from "@/toolcraft/ui";

import { Artistic3DRenderer } from "./artistic-3d-renderer";

function previewCanvas(): HTMLCanvasElement | null {
  return document.querySelector<HTMLCanvasElement>("[data-toolcraft-artistic-3d-output='true'] canvas");
}

export function Artistic3DExportControl(_props: ToolcraftCustomControlRendererProps): React.JSX.Element {
  const store = useToolcraftStore();
  const [recording, setRecording] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const recorderRef = React.useRef<ToolcraftCanvasRecorder | null>(null);
  const animationRef = React.useRef(0);

  const stopRecording = async (): Promise<void> => {
    cancelAnimationFrame(animationRef.current);
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);
    if (!recorder) return;
    try {
      downloadToolcraftVideo(await recorder.stop(), "artistic-3d.webm");
      setMessage("Video downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recording failed.");
    }
  };

  const startRecording = (): void => {
    store.syncPlayhead();
    const state = store.getState();
    try {
      const source = previewCanvas();
      if (!source) throw new Error("3D preview is not ready.");
      const size = getToolcraftVideoExportSize({ resolution: String(state.values["export.video.resolution"] ?? "current"), state });
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Video export canvas is unavailable.");
      const recorder = new ToolcraftCanvasRecorder({ canvas, frameRate: 30 });
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setMessage("");
      const copy = () => {
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        if (recorderRef.current === recorder) animationRef.current = requestAnimationFrame(copy);
      };
      copy();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recording is unavailable.");
    }
  };

  React.useEffect(() => () => {
    cancelAnimationFrame(animationRef.current);
    if (recorderRef.current) void recorderRef.current.stop();
  }, []);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <Button onClick={() => { store.syncPlayhead(); void Artistic3DRenderer.exportImage(store.getState()); }} size="sm" type="button">Export image</Button>
        <Button onClick={() => recording ? void stopRecording() : startRecording()} size="sm" type="button" variant={recording ? "destructive-outline" : "outline"}>{recording ? "Stop recording" : "Record video"}</Button>
      </div>
      {message ? <p className="text-[11px] text-[color:var(--muted-foreground)]">{message}</p> : null}
    </div>
  );
}
