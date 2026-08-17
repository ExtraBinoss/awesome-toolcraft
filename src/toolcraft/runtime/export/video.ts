export type ToolcraftCanvasRecorderOptions = {
  canvas: HTMLCanvasElement;
  frameRate?: number;
  mimeType?: string;
};

export type ToolcraftDeterministicVideoOptions = {
  canvas: HTMLCanvasElement;
  durationSeconds: number;
  frameRate?: number;
  renderFrame: (timeSeconds: number, frameIndex: number) => Promise<void> | void;
  signal?: AbortSignal;
};

export async function encodeToolcraftDeterministicVideo({
  canvas,
  durationSeconds,
  frameRate = 30,
  renderFrame,
  signal,
}: ToolcraftDeterministicVideoOptions): Promise<Blob> {
  const {
    BufferTarget,
    CanvasSource,
    getFirstEncodableVideoCodec,
    Output,
    QUALITY_VERY_HIGH,
    WebMOutputFormat,
  } = await import("mediabunny");
  const format = new WebMOutputFormat();
  const codec = await getFirstEncodableVideoCodec(format.getSupportedVideoCodecs(), {
    height: canvas.height,
    quality: QUALITY_VERY_HIGH,
    width: canvas.width,
  });
  if (!codec) throw new Error("Deterministic WebM export is not supported by this browser.");

  const target = new BufferTarget();
  const output = new Output({ format, target });
  const source = new CanvasSource(canvas, {
    alpha: "keep",
    codec,
    contentHint: "detail",
    keyFrameInterval: Math.min(2, durationSeconds),
    quality: QUALITY_VERY_HIGH,
  });
  output.addVideoTrack(source, { frameRate });
  await output.start();

  const frameDuration = 1 / frameRate;
  const frameCount = Math.max(1, Math.ceil(durationSeconds * frameRate));
  const encodeFrame = async (frameIndex: number): Promise<void> => {
    if (frameIndex >= frameCount) return;
    if (signal?.aborted) throw new DOMException("Video export canceled.", "AbortError");
    const timestamp = frameIndex * frameDuration;
    const sampleDuration = Math.min(frameDuration, durationSeconds - timestamp);
    await renderFrame(timestamp, frameIndex);
    // Frames must remain sequential: each one mutates the same canvas, and
    // CanvasSource.add provides the encoder's required backpressure.
    await source.add(timestamp, sampleDuration, { keyFrame: frameIndex === 0 });
    await encodeFrame(frameIndex + 1);
  };
  try {
    await encodeFrame(0);
    await output.finalize();
  } catch (error) {
    if (output.state !== "finalized" && output.state !== "canceled") await output.cancel();
    throw error;
  }

  if (!target.buffer) throw new Error("Deterministic video encoding produced no output.");
  return new Blob([target.buffer], { type: await output.getMimeType() });
}

function chooseMimeType(requested?: string): string {
  const candidates = [requested, "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const recorder = globalThis.MediaRecorder;
  if (!recorder) throw new Error("Video recording is not supported in this browser.");
  const supported = candidates.find((candidate) => candidate && recorder.isTypeSupported(candidate));
  if (!supported) throw new Error("No supported WebM recording format was found.");
  return supported;
}

export class ToolcraftCanvasRecorder {
  private readonly chunks: Blob[] = [];
  private readonly mediaRecorder: MediaRecorder;

  constructor({ canvas, frameRate = 30, mimeType }: ToolcraftCanvasRecorderOptions) {
    if (!("MediaRecorder" in globalThis) || !("captureStream" in canvas)) {
      throw new Error("Canvas video recording is not supported in this browser.");
    }
    const stream = canvas.captureStream(frameRate);
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: chooseMimeType(mimeType) });
    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
  }

  get state(): RecordingState {
    return this.mediaRecorder.state;
  }

  start(): void {
    this.mediaRecorder.start(250);
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder;
      const handleStop = () => resolve(new Blob(this.chunks, { type: recorder.mimeType || "video/webm" }));
      const handleError = () => reject(new Error("Video recording failed."));
      recorder.addEventListener("stop", handleStop, { once: true });
      recorder.addEventListener("error", handleError, { once: true });
      if (recorder.state !== "inactive") recorder.stop();
      else handleStop();
    });
  }
}

export function downloadToolcraftVideo(blob: Blob, fileName = "toolcraft-recording.webm"): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
