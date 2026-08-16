import * as React from "react";

import {
  createToolcraftPngExportCanvas,
  getToolcraftVideoExportSize,
} from "@/toolcraft/runtime/export/export";
import {
  downloadToolcraftVideo,
  ToolcraftCanvasRecorder,
} from "@/toolcraft/runtime/export/video";
import { useToolcraftStore } from "@/toolcraft/runtime/react/app-shell/use-toolcraft";
import type { ToolcraftCustomControlRendererProps } from "@/toolcraft/runtime/react/controls-panel/control-renderers";
import { Button } from "@/toolcraft/ui/components/primitives/button";

import { getAsciiLabCanvas } from "./ascii-lab-canvas";

export function AsciiLabExportControl(_props: ToolcraftCustomControlRendererProps): React.JSX.Element {
  const store = useToolcraftStore();
  const [recording, setRecording] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const recorderRef = React.useRef<ToolcraftCanvasRecorder | null>(null);
  const animationRef = React.useRef(0);

  const exportImage = async (): Promise<void> => {
    store.syncPlayhead();
    const state = store.getState();
    const source = getAsciiLabCanvas();

    if (!source) {
      setMessage("Preview is not ready.");
      return;
    }

    try {
      const canvas = createToolcraftPngExportCanvas({
        background: String(state.values["scene.background"] ?? "#020307"),
        includeBackground: true,
        render: ({ context, cssHeight, cssWidth }) => {
          context.drawImage(source, 0, 0, cssWidth, cssHeight);
        },
        resolution: String(state.values["export.image.resolution"] ?? "2k"),
        state,
      });
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("Image export failed."))),
          "image/png",
        );
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "ascii-lab.png";
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("PNG exported.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image export failed.");
    }
  };

  const stopRecording = async (): Promise<void> => {
    cancelAnimationFrame(animationRef.current);
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);

    if (!recorder) {
      return;
    }

    try {
      downloadToolcraftVideo(await recorder.stop(), "ascii-lab.webm");
      setMessage("WebM exported.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Video export failed.");
    }
  };

  const startRecording = (): void => {
    store.syncPlayhead();
    const state = store.getState();
    try {
      const source = getAsciiLabCanvas();

      if (!source) {
        throw new Error("Preview is not ready.");
      }

      const size = getToolcraftVideoExportSize({
        resolution: String(state.values["export.video.resolution"] ?? "current"),
        state,
      });
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Export canvas is unavailable.");
      }

      const recorder = new ToolcraftCanvasRecorder({ canvas, frameRate: 30 });
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setMessage("Recording ASCII output…");

      const copyFrame = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(source, 0, 0, canvas.width, canvas.height);

        if (recorderRef.current === recorder) {
          animationRef.current = requestAnimationFrame(copyFrame);
        }
      };

      copyFrame();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Video export is unavailable.");
    }
  };

  React.useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (recorderRef.current) {
        void recorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <Button onClick={() => void exportImage()} size="sm" type="button">
          Export PNG
        </Button>
        <Button
          onClick={() => (recording ? void stopRecording() : startRecording())}
          size="sm"
          type="button"
          variant={recording ? "destructive-outline" : "outline"}
        >
          {recording ? "Stop video" : "Export video"}
        </Button>
      </div>
      {message ? <p className="text-[11px] text-[color:var(--muted-foreground)]">{message}</p> : null}
    </div>
  );
}
