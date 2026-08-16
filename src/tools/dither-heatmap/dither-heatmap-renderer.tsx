import * as React from "react";

import { shouldIncludeToolcraftPreviewBackground } from "@/toolcraft/runtime/export/export";
import { useToolcraftSelector, useToolcraftStore } from "@/toolcraft/runtime/react/app-shell/use-toolcraft";
import type { ToolcraftMediaAsset, ToolcraftState } from "@/toolcraft/runtime/state/types";

type PaletteStop = { color: string; position: string | number };
type PaletteValue = { stops: PaletteStop[] };
type SourceElement = HTMLImageElement | HTMLVideoElement;

const BAYER_4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

function numberValue(state: ToolcraftState, target: string, fallback: number): number {
  const value = state.values[target];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(state: ToolcraftState, target: string, fallback: string): string {
  const value = state.values[target];
  return typeof value === "string" ? value : fallback;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((item) => item + item).join("") : clean.padEnd(6, "0").slice(0, 6);
  return [0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16)) as [number, number, number];
}

function mixColor(a: [number, number, number], b: [number, number, number], amount: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount];
}

function hash(x: number, y: number, frame: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + frame * 0.017) * 43758.5453;
  return value - Math.floor(value);
}

function positionValue(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? clamp(parsed / 100) : 0;
}

function paletteColors(state: ToolcraftState): [number, number, number][] {
  const value = state.values["heatmap.palette"];
  const fallback = ["#15002D", "#3C2E9D", "#E63151", "#FF9F43", "#FFE98A"];
  if (!value || typeof value !== "object" || !("stops" in value) || !Array.isArray(value.stops)) return fallback.map(hexToRgb);
  return [...(value as PaletteValue).stops].sort((a, b) => positionValue(a.position) - positionValue(b.position)).map((stop) => hexToRgb(stop.color));
}

function paletteColor(colors: [number, number, number][], amount: number): [number, number, number] {
  if (colors.length < 2) return colors[0] ?? [255, 255, 255];
  const position = clamp(amount) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(position));
  return mixColor(colors[index], colors[index + 1], position - index);
}

function sourceDimensions(source: SourceElement): [number, number] {
  if (source instanceof HTMLVideoElement) return [source.videoWidth || 16, source.videoHeight || 9];
  return [source.naturalWidth || 16, source.naturalHeight || 9];
}

function drawSource(context: CanvasRenderingContext2D, source: SourceElement, state: ToolcraftState, includeBackground: boolean): void {
  const [sourceWidth, sourceHeight] = sourceDimensions(source);
  const { width, height } = context.canvas;
  const sourceRatio = sourceWidth / sourceHeight;
  const canvasRatio = width / height;
  const fit = stringValue(state, "media.fit", "contain");
  let drawWidth = width;
  let drawHeight = height;
  if ((fit === "contain" && sourceRatio > canvasRatio) || (fit === "cover" && sourceRatio < canvasRatio)) drawHeight = width / sourceRatio;
  else drawWidth = height * sourceRatio;
  context.clearRect(0, 0, width, height);
  if (includeBackground) {
    context.fillStyle = stringValue(state, "appearance.background", "#0D0D11");
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function renderDither(context: CanvasRenderingContext2D, state: ToolcraftState, frame: number): void {
  const image = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  const { data, width, height } = image;
  const colorA = hexToRgb(stringValue(state, "dither.colorA", "#F5D500"));
  const colorB = hexToRgb(stringValue(state, "dither.colorB", "#111116"));
  const colorC = hexToRgb(stringValue(state, "dither.colorC", "#F04D8C"));
  const blockSize = Math.max(1, Math.round(numberValue(state, "dither.pixelSize", 5)));
  const levels = Math.max(2, Math.round(numberValue(state, "dither.posterize", 2)));
  const contrast = numberValue(state, "dither.contrast", 100) / 100;
  const threshold = numberValue(state, "dither.threshold", 50);
  const colorMode = stringValue(state, "dither.colorMode", "duotone");
  const patternMode = stringValue(state, "dither.pattern", "ordered");

  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      const sampleX = Math.min(width - 1, x + Math.floor(blockSize / 2));
      const sampleY = Math.min(height - 1, y + Math.floor(blockSize / 2));
      const sampleIndex = (sampleY * width + sampleX) * 4;
      const sampleAlpha = data[sampleIndex + 3];
      const luminance = (data[sampleIndex] * .2126 + data[sampleIndex + 1] * .7152 + data[sampleIndex + 2] * .0722) / 255;
      const adjusted = clamp((luminance - .5) * contrast + .5);
      const matrixX = Math.floor(x / blockSize) % 4;
      const matrixY = Math.floor(y / blockSize) % 4;
      const pattern = patternMode === "noise" ? hash(x, y, frame) : patternMode === "checker" ? ((matrixX + matrixY) % 2) * .32 : (BAYER_4[matrixY][matrixX] + .5) / 16;
      const tone = clamp(adjusted + (pattern - .5) * .24 - (threshold - 50) / 240);
      const quantized = Math.round(tone * (levels - 1)) / (levels - 1);
      let color: [number, number, number];
      if (colorMode === "grayscale") color = [quantized * 255, quantized * 255, quantized * 255];
      else if (colorMode === "monochrome") color = tone > .5 ? colorA : colorB;
      else if (colorMode === "rgb") color = [data[sampleIndex] > 128 ? colorA[0] : colorB[0], data[sampleIndex + 1] > 128 ? colorC[1] : colorB[1], data[sampleIndex + 2] > 128 ? colorA[2] : colorC[2]];
      else color = mixColor(colorB, colorA, quantized);
      for (let blockY = y; blockY < Math.min(y + blockSize, height); blockY += 1) for (let blockX = x; blockX < Math.min(x + blockSize, width); blockX += 1) {
        const index = (blockY * width + blockX) * 4;
        data[index] = color[0]; data[index + 1] = color[1]; data[index + 2] = color[2]; data[index + 3] = sampleAlpha;
      }
    }
  }
  context.putImageData(image, 0, 0);
}

function renderHeatmap(context: CanvasRenderingContext2D, state: ToolcraftState, time: number): void {
  const image = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  const { data, width, height } = image;
  const colors = paletteColors(state);
  const contourAmount = numberValue(state, "heatmap.contour", 45);
  const noiseAmount = numberValue(state, "heatmap.noise", 22);
  const glowAmount = numberValue(state, "heatmap.glow", 58);
  const motion = numberValue(state, "heatmap.motion", 20);
  const radians = numberValue(state, "heatmap.angle", 0) * Math.PI / 180;
  const contourSize = 5 + contourAmount * .14;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 4;
    if (data[index + 3] === 0) continue;
    const luminance = (data[index] * .2126 + data[index + 1] * .7152 + data[index + 2] * .0722) / 255;
    const directional = (x / width - .5) * Math.cos(radians) + (y / height - .5) * Math.sin(radians);
    const wave = Math.sin((directional + time * motion * .0035) * 26) * .5 + .5;
    const noise = hash(x, y, Math.round(time * motion * 12));
    const value = clamp(luminance * .78 + wave * .12 + noise * noiseAmount / 500);
    let color = paletteColor(colors, value);
    const contour = Math.abs((value * contourSize) % 1 - .5);
    const contourLine = clamp(1 - contour * (7 - contourAmount * .045));
    color = mixColor(color, [255, 255, 255], contourLine * contourAmount * .008);
    const glow = Math.pow(value, 2.5) * glowAmount * .011;
    data[index] = color[0] + glow * 255; data[index + 1] = color[1] + glow * 180; data[index + 2] = color[2] + glow * 80; data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

function selectedSource(state: ToolcraftState): ToolcraftMediaAsset | undefined {
  return state.mediaAssets.find((asset) => asset.sourceTarget === "media.source");
}

export function DitherHeatmapRenderer(): React.JSX.Element {
  const store = useToolcraftStore();
  const state = useToolcraftSelector(React.useCallback((snapshot) => snapshot, []));
  const source = selectedSource(state);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stateRef = React.useRef(state);
  const [status, setStatus] = React.useState("");
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) { setStatus("Canvas 2D is unavailable."); return; }
    let stopped = false;
    let animation = 0;
    let frame = 0;
    const isVideo = source.mimeType?.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv)$/i.test(source.fileName);
    const element: SourceElement = isVideo ? document.createElement("video") : new Image();
    if (element instanceof HTMLVideoElement) { element.muted = true; element.loop = true; element.playsInline = true; element.preload = "auto"; }
    const render = () => {
      if (stopped) return;
      const committed = stateRef.current;
      const current: ToolcraftState = {
        ...committed,
        timeline: { ...committed.timeline, currentTimeSeconds: store.getPlayhead() },
        values: store.getEvaluatedValues(),
      };
      const includeBackground = shouldIncludeToolcraftPreviewBackground({ state: current });
      if (element instanceof HTMLVideoElement) {
        if (current.timeline.isPlaying && element.paused) void element.play().catch(() => undefined);
        if (!current.timeline.isPlaying && !element.paused) element.pause();
        const duration = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : current.timeline.durationSeconds;
        const desired = current.timeline.currentTimeSeconds % duration;
        if (!current.timeline.isPlaying && Math.abs(element.currentTime - desired) > .04) element.currentTime = desired;
      }
      drawSource(context, element, current, includeBackground);
      if (stringValue(current, "effect.mode", "dither") === "heatmap") renderHeatmap(context, current, current.timeline.currentTimeSeconds);
      else renderDither(context, current, frame++);
      animation = requestAnimationFrame(render);
    };
    const readyEvent = element instanceof HTMLVideoElement ? "loadeddata" : "load";
    const ready = () => {
      canvas.width = Math.max(1, Math.round(stateRef.current.canvas.size.width));
      canvas.height = Math.max(1, Math.round(stateRef.current.canvas.size.height));
      setStatus("");
      render();
    };
    const failed = () => setStatus("Media could not be loaded.");
    element.addEventListener(readyEvent, ready, { once: true });
    element.addEventListener("error", failed, { once: true });
    element.src = source.dataUrl;
    if (element instanceof HTMLVideoElement) element.load();
    return () => { stopped = true; cancelAnimationFrame(animation); element.removeEventListener(readyEvent, ready); element.removeEventListener("error", failed); if (element instanceof HTMLVideoElement) { element.pause(); element.removeAttribute("src"); element.load(); } };
  }, [source?.dataUrl, source?.fileName, source?.mimeType, store]);

  return (
    <div className="absolute inset-0 grid place-items-center bg-transparent" data-toolcraft-product-output>
      <canvas className="h-full w-full object-contain" data-toolcraft-dither-heatmap-canvas="true" ref={canvasRef} />
      {status ? <div className="absolute bottom-3 rounded-md bg-black/75 px-3 py-1.5 text-xs text-white">{status}</div> : null}
    </div>
  );
}
