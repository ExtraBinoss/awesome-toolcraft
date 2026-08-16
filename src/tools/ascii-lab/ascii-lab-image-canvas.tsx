"use client";

import * as React from "react";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime/state/types";
import type { ToolcraftStore } from "@/toolcraft/runtime/state/store";

function numberValue(values: Record<string, unknown>, target: string, fallback: number): number {
  const value = values[target];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(values: Record<string, unknown>, target: string, fallback: string): string {
  const value = values[target];
  return typeof value === "string" ? value : fallback;
}

function parseHexColor(value: string, fallback: [number, number, number]): [number, number, number] {
  const clean = value.replace("#", "");
  const normalized = clean.length === 3
    ? clean.split("").map((part) => `${part}${part}`).join("")
    : clean.padEnd(6, "0").slice(0, 6);
  const channels = [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
  return channels.every(Number.isFinite) ? channels as [number, number, number] : fallback;
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  amount: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ];
}

function clampValue(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function asciiHash(x: number, y: number, time: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + time * 0.017) * 43758.5453123;
  return value - Math.floor(value);
}

function renderAsciiImage(
  canvas: HTMLCanvasElement,
  buffer: HTMLCanvasElement,
  image: HTMLImageElement,
  values: Record<string, unknown>,
  timestamp: number,
): void {
  const renderScale = numberValue(values, "canvas.renderScale", 1);
  const width = Math.max(1, Math.round(1280 * renderScale));
  const height = Math.max(1, Math.round(720 * renderScale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  if (!context || !bufferContext) {
    return;
  }

  const background = parseHexColor(stringValue(values, "ascii.background", "#050609"), [5, 6, 9]);
  context.fillStyle = `rgb(${background.join(",")})`;
  context.fillRect(0, 0, width, height);
  const characters = Array.from(stringValue(values, "ascii.charset", " .,:;irsXA253hMHGS#9B&@"));
  const charset = characters.length > 0 ? characters : [" "];
  const cellWidth = Math.max(4, numberValue(values, "ascii.cellSize", 12) * renderScale);
  const cellHeight = cellWidth * 1.52;
  const columns = Math.ceil(width / cellWidth);
  const rows = Math.ceil(height / cellHeight);
  if (buffer.width !== columns || buffer.height !== rows) {
    buffer.width = columns;
    buffer.height = rows;
  }
  bufferContext.clearRect(0, 0, columns, rows);

  const sourceWidth = image.naturalWidth || image.width || 1;
  const sourceHeight = image.naturalHeight || image.height || 1;
  const sourceAspect = sourceWidth / sourceHeight;
  const canvasAspect = width / height;
  const fit = stringValue(values, "ascii.fit", "contain");
  let drawWidth = width;
  let drawHeight = height;
  if ((fit === "contain" && sourceAspect > canvasAspect) || (fit === "cover" && sourceAspect < canvasAspect)) {
    drawHeight = width / sourceAspect;
  } else {
    drawWidth = height * sourceAspect;
  }
  bufferContext.drawImage(
    image,
    (width - drawWidth) / (2 * cellWidth),
    (height - drawHeight) / (2 * cellHeight),
    drawWidth / cellWidth,
    drawHeight / cellHeight,
  );

  const pixels = bufferContext.getImageData(0, 0, columns, rows).data;
  const contrast = numberValue(values, "ascii.contrast", 1.2);
  const brightness = numberValue(values, "ascii.brightness", 0);
  const depthStrength = numberValue(values, "ascii.depthStrength", 65) / 100;
  const depthContrast = numberValue(values, "ascii.depthContrast", 1.3);
  const jitter = numberValue(values, "ascii.jitter", 18) / 100;
  const mode = stringValue(values, "ascii.mode", "hybrid");
  const direction = stringValue(values, "ascii.direction", "right");
  const colorMode = stringValue(values, "ascii.colorMode", "source");
  const foreground = parseHexColor(stringValue(values, "ascii.foreground", "#D8FF65"), [216, 255, 101]);
  const motion = numberValue(values, "ascii.motion", 18) / 100;
  const time = timestamp * 0.001;

  context.font = `700 ${Math.max(8, Math.round(cellHeight * 0.78))}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const pixelIndex = (row * columns + column) * 4;
      const alpha = pixels[pixelIndex + 3] / 255;
      if (alpha < 0.04) {
        continue;
      }
      const sourceColor: [number, number, number] = [pixels[pixelIndex], pixels[pixelIndex + 1], pixels[pixelIndex + 2]];
      const luminance = (sourceColor[0] * 0.299 + sourceColor[1] * 0.587 + sourceColor[2] * 0.114) / 255;
      const localX = column / Math.max(1, columns - 1) - 0.5;
      const localY = row / Math.max(1, rows - 1) - 0.5;
      let waveCoordinate = localX;
      let crossCoordinate = localY;
      let flowTime = -time * motion;
      if (direction === "left" || direction === "horizontal") {
        flowTime = time * motion;
      } else if (direction === "up") {
        waveCoordinate = localY;
        crossCoordinate = localX;
      } else if (direction === "down" || direction === "vertical") {
        waveCoordinate = localY;
        crossCoordinate = localX;
        flowTime = time * motion;
      } else if (direction === "up-right") {
        waveCoordinate = (localX + localY) * 0.7071;
        crossCoordinate = (localX - localY) * 0.7071;
      } else if (direction === "up-left") {
        waveCoordinate = (-localX + localY) * 0.7071;
        crossCoordinate = (localX + localY) * 0.7071;
      } else if (direction === "down-right") {
        waveCoordinate = (localX - localY) * 0.7071;
        crossCoordinate = (localX + localY) * 0.7071;
      } else if (direction === "down-left" || direction === "diagonal") {
        waveCoordinate = (localX + localY) * 0.7071;
        crossCoordinate = (localX - localY) * 0.7071;
        flowTime = time * motion;
      } else if (direction === "clockwise" || direction === "counter-clockwise") {
        waveCoordinate = Math.atan2(localY, localX) / Math.PI;
        crossCoordinate = Math.hypot(localX, localY) * 1.4;
        flowTime = (direction === "clockwise" ? -1 : 1) * time * motion;
      } else if (direction === "radial-out" || direction === "radial-in" || direction === "radial") {
        waveCoordinate = Math.hypot(localX, localY) * 1.4;
        crossCoordinate = Math.atan2(localY, localX) / Math.PI;
        flowTime = (direction === "radial-in" ? 1 : -1) * time * motion;
      }
      const wave = Math.sin((waveCoordinate * 2.2 + flowTime) * Math.PI) * Math.cos((crossCoordinate * 1.7 - flowTime * 0.73) * Math.PI);
      const radial = 1 - Math.min(1, Math.hypot(localX, localY) / 0.9);
      let depth = clampValue(0.45 + wave * 0.22 + radial * 0.35 + asciiHash(column, row, time * motion) * 0.18);
      depth = clampValue((depth - 0.5) * depthContrast + 0.5);
      const tone = clampValue((luminance - 0.5) * contrast + 0.5 + brightness);
      let mapped = mode === "depth" ? depth : mode === "hybrid" ? tone * (1 - depthStrength) + depth * depthStrength : tone;
      if (values["ascii.invert"] === true) {
        mapped = 1 - mapped;
      }
      const jittered = clampValue(mapped + (asciiHash(column, row, 0) - 0.5) * jitter * 0.45);
      const character = charset[Math.min(charset.length - 1, Math.floor(jittered * charset.length))] ?? " ";
      let ink = sourceColor;
      if (colorMode === "custom") {
        ink = foreground;
      } else if (colorMode === "gradient") {
        ink = mixRgb(foreground, [255, 40, 150], mapped * 0.72);
      }
      context.fillStyle = `rgb(${ink.map((channel) => Math.round(channel)).join(",")})`;
      context.fillText(character, column * cellWidth + cellWidth * 0.5, row * cellHeight + cellHeight * 0.5);
    }
  }
}

export function AsciiImageCanvas({
  asset,
  keyframeGroupsRevision,
  store,
  valuesRevision,
}: {
  asset: ToolcraftMediaAsset;
  keyframeGroupsRevision: readonly unknown[];
  store: ToolcraftStore;
  valuesRevision: Record<string, unknown>;
}): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [buffer] = React.useState(() => document.createElement("canvas"));
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const lastRenderedTimestampRef = React.useRef(Number.NEGATIVE_INFINITY);
  const renderRef = React.useRef<(timeSeconds: number) => void>(() => undefined);

  React.useEffect(() => {
    renderRef.current = (timeSeconds) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (canvas && image) {
        renderAsciiImage(
          canvas,
          buffer,
          image,
          store.getEvaluatedValues(),
          timeSeconds * 1_000,
        );
      }
    };
    renderRef.current(store.getPlayhead());
  }, [buffer, keyframeGroupsRevision, store, valuesRevision]);

  React.useEffect(() => {
    const image = new Image();
    image.addEventListener("load", () => {
      imageRef.current = image;
      renderRef.current(store.getPlayhead());
    }, { once: true });
    image.src = asset.dataUrl;
    return () => {
      imageRef.current = null;
    };
  }, [asset.dataUrl, store]);

  React.useEffect(() => {
    return store.subscribePlayhead((timeSeconds, timestamp) => {
      const values = store.getEvaluatedValues();
      const requestedFps = Number(values["performance.fps"] ?? 30);
      const frameInterval = 1_000 / Math.max(1, Math.min(60, requestedFps));

      if (timestamp - lastRenderedTimestampRef.current < frameInterval - 0.5) {
        return;
      }

      lastRenderedTimestampRef.current = timestamp;
      renderRef.current(timeSeconds);
    });
  }, [store]);

  return <canvas className="absolute inset-0 h-full w-full" data-toolcraft-ascii-lab-canvas="true" ref={canvasRef} />;
}
