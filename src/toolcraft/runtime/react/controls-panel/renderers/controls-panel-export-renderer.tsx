import * as React from "react";

import { createToolcraftPngExportCanvas, getToolcraftVideoExportSize } from "../../../export/export";
import { downloadToolcraftVideo, encodeToolcraftDeterministicVideo } from "../../../export/video";
import type { ToolcraftControlSchema } from "../../../schema/types";
import { Button } from "../../../../ui/components/primitives/button";
import { useToolcraftStore } from "../../app-shell/use-toolcraft";
import { SaveToLibraryButton } from "../../export/save-to-library-button";

function extension(format: string): "jpg" | "png" {
  return format === "jpg" || format === "jpeg" ? "jpg" : "png";
}

function outputCanvas(selector?: string): HTMLCanvasElement | null {
  if (selector) return document.querySelector<HTMLCanvasElement>(selector);
  return document.querySelector<HTMLCanvasElement>("[data-toolcraft-product-output] canvas");
}

function colorSetting(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "hex" in value && typeof value.hex === "string") return value.hex;
  return fallback;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type RecordingPlaybackSnapshot = {
  isPlaying: boolean;
  playheadSeconds: number;
};

export function ToolcraftExportControlRenderer({ control }: { control: ToolcraftControlSchema }): React.JSX.Element {
  const store = useToolcraftStore();
  const [recording, setRecording] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const exportAbortRef = React.useRef<AbortController | null>(null);
  const playbackSnapshotRef = React.useRef<RecordingPlaybackSnapshot | null>(null);
  const baseName = control.exportFileName?.replace(/\.(?:jpe?g|png|webm)$/i, "") || "toolcraft-export";

  const createImageBlob = async (): Promise<Blob> => {
    store.syncPlayhead();
    const state = store.getState();
    const source = outputCanvas(control.exportOutputSelector);
    if (!source) throw new Error("Preview is not ready.");
    const includeTarget = control.exportIncludeBackgroundTarget ?? "export.includeBackground";
    const backgroundTarget = control.exportBackgroundTarget ?? "appearance.background";
    const includeBackground = state.values[includeTarget] !== false;
    const background = colorSetting(state.values[backgroundTarget], "#000000");
    const resolution = String(state.values["export.image.resolution"] ?? "current");
    const canvas = createToolcraftPngExportCanvas({
      background,
      includeBackground,
      render: ({ context, cssHeight, cssWidth }) => context.drawImage(source, 0, 0, cssWidth, cssHeight),
      resolution,
      state,
    });
    const format = extension(String(state.values["export.image.format"] ?? "png"));
    return new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Image export failed.")),
      format === "jpg" ? "image/jpeg" : "image/png",
      .96,
    ));
  };

  const exportImage = async (): Promise<void> => {
    try {
      const format = extension(String(store.getState().values["export.image.format"] ?? "png"));
      downloadBlob(await createImageBlob(), `${baseName}.${format}`);
      setMessage("Image exported.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image export failed.");
    }
  };

  const restorePlayback = React.useCallback((): void => {
    const playbackSnapshot = playbackSnapshotRef.current;
    playbackSnapshotRef.current = null;
    if (playbackSnapshot) {
      store.setPlayhead(playbackSnapshot.playheadSeconds, performance.now());
      store.syncPlayhead();
      store.dispatch({ isPlaying: playbackSnapshot.isPlaying, type: "timeline.setPlaying" });
    }
  }, [store]);

  const stopRecording = (): void => {
    exportAbortRef.current?.abort();
  };

  const startRecording = async (): Promise<void> => {
    store.syncPlayhead();
    const state = store.getState();
    try {
      const source = outputCanvas(control.exportOutputSelector);
      if (!source) throw new Error("Preview is not ready.");
      const size = getToolcraftVideoExportSize({ resolution: String(state.values["export.video.resolution"] ?? "current"), state });
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Export canvas is unavailable.");
      const durationSeconds = Math.max(0.001, state.timeline.durationSeconds);
      const abortController = new AbortController();
      exportAbortRef.current = abortController;
      playbackSnapshotRef.current = {
        isPlaying: state.timeline.isPlaying,
        playheadSeconds: store.getPlayhead(),
      };
      store.dispatch({ isPlaying: false, type: "timeline.setPlaying" });
      store.setPlayhead(0, performance.now());
      store.syncPlayhead();
      setRecording(true);
      setMessage(`Rendering ${Math.ceil(durationSeconds * 30)} frames…`);
      const blob = await encodeToolcraftDeterministicVideo({
        canvas,
        durationSeconds,
        frameRate: 30,
        signal: abortController.signal,
        renderFrame: async (timeSeconds) => {
          store.setPlayhead(timeSeconds, performance.now());
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(source, 0, 0, canvas.width, canvas.height);
        },
      });
      downloadToolcraftVideo(blob, `${baseName}.webm`);
      setMessage(`Video exported (${durationSeconds.toFixed(2)}s).`);
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError"
        ? "Video export canceled."
        : error instanceof Error ? error.message : "Video export is unavailable.");
    } finally {
      exportAbortRef.current = null;
      setRecording(false);
      restorePlayback();
    }
  };

  React.useEffect(() => () => {
    exportAbortRef.current?.abort();
    restorePlayback();
  }, [restorePlayback]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <Button onClick={() => void exportImage()} size="sm" type="button">Export image</Button>
        <Button onClick={() => recording ? stopRecording() : void startRecording()} size="sm" type="button" variant={recording ? "destructive-outline" : "outline"}>
          {recording ? "Cancel export" : "Export video"}
        </Button>
      </div>
      <div className="grid">
        <SaveToLibraryButton
          createBlob={createImageBlob}
          disabled={recording}
          fileName={() => `${baseName}.${extension(String(store.getState().values["export.image.format"] ?? "png"))}`}
        />
      </div>
      {message ? <p className="text-[11px] text-[color:var(--muted-foreground)]">{message}</p> : null}
    </div>
  );
}
