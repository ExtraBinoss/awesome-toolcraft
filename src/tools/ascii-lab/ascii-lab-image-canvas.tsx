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

function colorValue(values: Record<string, unknown>, target: string, fallback: string): string {
  const value = values[target];
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "hex" in value) {
    const hex = (value as { hex?: unknown }).hex;
    if (typeof hex === "string") return hex;
  }
  return fallback;
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

function getLoopProgress(timestamp: number, durationSeconds: number): number {
  const duration = Math.max(0.001, durationSeconds);
  const timeSeconds = timestamp * 0.001;
  return ((timeSeconds % duration) + duration) % duration / duration;
}

function getLoopCycleMix(amount: number): { blend: number; high: number; low: number } {
  const cycles = clampValue(amount) * 6;
  const low = Math.floor(cycles);
  return { blend: cycles - low, high: Math.ceil(cycles), low };
}

function loopOscillation(
  progress: number,
  cycleMix: ReturnType<typeof getLoopCycleMix>,
  phaseOffset = 0,
): number {
  const lowValue = Math.sin(progress * Math.PI * 2 * cycleMix.low + phaseOffset);
  const highValue = Math.sin(progress * Math.PI * 2 * cycleMix.high + phaseOffset);
  return lowValue + (highValue - lowValue) * cycleMix.blend;
}

const TEXT_FONT_FAMILIES = {
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  sans: "Inter, ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, Cambria, serif",
} as const;

function measureTrackedText(
  context: CanvasRenderingContext2D,
  value: string,
  tracking: number,
): number {
  const glyphs = Array.from(value);
  return context.measureText(value).width + Math.max(0, glyphs.length - 1) * tracking;
}

function splitLongWord(
  context: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
  tracking: number,
): string[] {
  const chunks: string[] = [];
  let chunk = "";

  for (const glyph of Array.from(word)) {
    const candidate = `${chunk}${glyph}`;
    if (chunk && measureTrackedText(context, candidate, tracking) > maxWidth) {
      chunks.push(chunk);
      chunk = glyph;
    } else {
      chunk = candidate;
    }
  }

  if (chunk) {
    chunks.push(chunk);
  }
  return chunks;
}

function wrapText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  tracking: number,
  maxLines = 5,
): string[] {
  const lines: string[] = [];

  for (const paragraph of value.replace(/\r\n?/g, "\n").split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";

    if (words.length === 0) {
      lines.push("");
      if (lines.length >= maxLines) return lines;
      continue;
    }

    for (const word of words) {
      const parts = measureTrackedText(context, word, tracking) > maxWidth
        ? splitLongWord(context, word, maxWidth, tracking)
        : [word];

      for (const part of parts) {
        const candidate = line ? `${line} ${part}` : part;
        if (line && measureTrackedText(context, candidate, tracking) > maxWidth) {
          lines.push(line);
          line = part;
        } else {
          line = candidate;
        }
        if (lines.length >= maxLines) return lines;
      }
    }

    if (line) lines.push(line);
    if (lines.length >= maxLines) return lines;
  }

  return lines;
}

function drawTrackedText(
  context: CanvasRenderingContext2D,
  value: string,
  startX: number,
  centerY: number,
  tracking: number,
  style: string,
  animation: string,
  animationAmount: number,
  loopProgress: number,
  cycleMix: ReturnType<typeof getLoopCycleMix>,
  fontSize: number,
  lineIndex: number,
): void {
  let x = startX;
  Array.from(value).forEach((glyph, glyphIndex) => {
    const glyphWidth = context.measureText(glyph).width;
    const wave = animation === "wave"
      ? loopOscillation(
          loopProgress,
          cycleMix,
          glyphIndex * 0.62 + lineIndex * 0.9,
        ) * fontSize * animationAmount * 0.12
      : 0;
    const glitchSteps = Math.max(1, Math.round(Math.max(1, cycleMix.high) * 12));
    const glitch = animation === "glitch"
      ? (asciiHash(glyphIndex, lineIndex, Math.floor(loopProgress * glitchSteps) % glitchSteps) - 0.5) * fontSize * animationAmount * 0.16
      : 0;
    const y = centerY + wave + glitch;
    const glyphX = x + glyphWidth * 0.5 + (animation === "glitch" ? glitch * 0.45 : 0);

    if (style === "outline" || style === "double") {
      context.strokeText(glyph, glyphX, y);
    }
    if (style !== "outline") {
      context.fillText(glyph, glyphX, y);
    }
    x += glyphWidth + tracking;
  });
}

function renderTextSource(
  sourceCanvas: HTMLCanvasElement,
  outputWidth: number,
  outputHeight: number,
  values: Record<string, unknown>,
  timestamp: number,
  durationSeconds: number,
): void {
  const renderScale = numberValue(values, "canvas.renderScale", 1);
  const supersampling = Math.max(1, 2 / renderScale);
  const width = Math.max(1, Math.round(outputWidth * supersampling));
  const height = Math.max(1, Math.round(outputHeight * supersampling));
  if (sourceCanvas.width !== width || sourceCanvas.height !== height) {
    sourceCanvas.width = width;
    sourceCanvas.height = height;
  }

  const context = sourceCanvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, width, height);

  const text = stringValue(values, "ascii.text", "TOOLCRAFT").trim();
  if (!text) return;

  const fontSize = height * numberValue(values, "ascii.textSize", 42) / 100;
  const tracking = numberValue(values, "ascii.textTracking", 0) * supersampling;
  const lineHeight = fontSize * numberValue(values, "ascii.textLineHeight", 0.92);
  const weight = stringValue(values, "ascii.textWeight", "900");
  const fontKey = stringValue(values, "ascii.textFont", "sans") as keyof typeof TEXT_FONT_FAMILIES;
  const fontFamily = TEXT_FONT_FAMILIES[fontKey] ?? TEXT_FONT_FAMILIES.sans;
  const align = stringValue(values, "ascii.textAlign", "center");
  const style = stringValue(values, "ascii.textStyle", "solid");
  const animation = stringValue(values, "ascii.textAnimation", "wave");
  const animationAmount = numberValue(values, "ascii.textAnimationAmount", 28) / 100;
  const animationSpeed = numberValue(values, "ascii.textAnimationSpeed", 35) / 100;
  const animationEnabled = values["motion.animate"] !== false;
  const loopProgress = animationEnabled ? getLoopProgress(timestamp, durationSeconds) : 0;
  const cycleMix = getLoopCycleMix(animationSpeed);

  context.font = `${weight} ${fontSize}px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = Math.max(2, fontSize * (style === "double" ? 0.055 : 0.032));
  context.fillStyle = "#fff";
  context.strokeStyle = "#fff";
  context.shadowColor = "rgba(255,255,255,0.9)";
  context.shadowBlur = fontSize * numberValue(values, "ascii.textGlow", 8) / 400;

  const maxWidth = width * 0.84;
  const lines = wrapText(context, text, maxWidth, tracking);
  const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
  const top = (height - blockHeight) * 0.5 + lineHeight * 0.5;
  const pulse = animation === "pulse"
    ? 1 + loopOscillation(loopProgress, cycleMix) * animationAmount * 0.07
    : 1;
  const driftX = animation === "drift" ? loopOscillation(loopProgress, cycleMix) * width * animationAmount * 0.04 : 0;
  const driftY = animation === "drift" ? loopOscillation(loopProgress, cycleMix, Math.PI * 0.5) * height * animationAmount * 0.035 : 0;

  context.save();
  context.translate(width * 0.5 + driftX, height * 0.5 + driftY);
  context.scale(pulse, pulse);
  context.translate(-width * 0.5, -height * 0.5);

  lines.forEach((line, lineIndex) => {
    const lineWidth = measureTrackedText(context, line, tracking);
    const startX = align === "left"
      ? width * 0.08
      : align === "right"
        ? width * 0.92 - lineWidth
        : (width - lineWidth) * 0.5;
    drawTrackedText(
      context,
      line,
      startX,
      top + lineIndex * lineHeight,
      tracking,
      style,
      animation,
      animationAmount,
      loopProgress,
      cycleMix,
      fontSize,
      lineIndex,
    );
  });
  context.restore();
}

function renderAsciiSource(
  canvas: HTMLCanvasElement,
  buffer: HTMLCanvasElement,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  values: Record<string, unknown>,
  timestamp: number,
  durationSeconds: number,
  textMode = false,
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

  const background = parseHexColor(colorValue(values, "ascii.background", "#050609"), [5, 6, 9]);
  context.fillStyle = `rgb(${background.join(",")})`;
  context.fillRect(0, 0, width, height);
  const characters = Array.from(stringValue(values, "ascii.charset", " .,:;irsXA253hMHGS#9B&@"));
  const charset = characters.length > 0 ? characters : [" "];
  const cellWidth = Math.max(4, numberValue(values, "ascii.cellSize", 12) * renderScale);
  const cellHeight = cellWidth * 1.52;
  const columns = Math.ceil(width / cellWidth);
  const rows = Math.max(1, Math.floor(height / cellHeight));
  if (buffer.width !== columns || buffer.height !== rows) {
    buffer.width = columns;
    buffer.height = rows;
  }
  bufferContext.clearRect(0, 0, columns, rows);

  const sourceAspect = sourceWidth / sourceHeight;
  const canvasAspect = width / height;
  const fit = textMode ? "contain" : stringValue(values, "ascii.fit", "contain");
  let drawWidth = width;
  let drawHeight = height;
  if ((fit === "contain" && sourceAspect > canvasAspect) || (fit === "cover" && sourceAspect < canvasAspect)) {
    drawHeight = width / sourceAspect;
  } else {
    drawWidth = height * sourceAspect;
  }
  bufferContext.drawImage(
    source,
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
  const mode = textMode ? "tone" : stringValue(values, "ascii.mode", "hybrid");
  const direction = stringValue(values, "ascii.direction", "right");
  const colorMode = stringValue(values, "ascii.colorMode", "source");
  const foreground = parseHexColor(colorValue(values, "ascii.foreground", "#D8FF65"), [216, 255, 101]);
  const motion = numberValue(values, "ascii.motion", 18) / 100;
  const loopProgress = getLoopProgress(timestamp, durationSeconds);
  const cycleMix = getLoopCycleMix(motion);
  const flowSign = direction === "left" ||
    direction === "horizontal" ||
    direction === "down" ||
    direction === "vertical" ||
    direction === "down-left" ||
    direction === "diagonal" ||
    direction === "counter-clockwise" ||
    direction === "radial-in"
    ? 1
    : -1;
  const lowFlowTime = flowSign * loopProgress * cycleMix.low * 2;
  const highFlowTime = flowSign * loopProgress * cycleMix.high * 2;

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
      const luminance = ((sourceColor[0] * 0.299 + sourceColor[1] * 0.587 + sourceColor[2] * 0.114) / 255) * alpha;
      const localX = column / Math.max(1, columns - 1) - 0.5;
      const localY = row / Math.max(1, rows - 1) - 0.5;
      let waveCoordinate = localX;
      let crossCoordinate = localY;
      if (direction === "up") {
        waveCoordinate = localY;
        crossCoordinate = localX;
      } else if (direction === "down" || direction === "vertical") {
        waveCoordinate = localY;
        crossCoordinate = localX;
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
      } else if (direction === "clockwise" || direction === "counter-clockwise") {
        waveCoordinate = Math.atan2(localY, localX) / Math.PI;
        crossCoordinate = Math.hypot(localX, localY) * 1.4;
      } else if (direction === "radial-out" || direction === "radial-in" || direction === "radial") {
        waveCoordinate = Math.hypot(localX, localY) * 1.4;
        crossCoordinate = Math.atan2(localY, localX) / Math.PI;
      }
      const lowWave = Math.sin((waveCoordinate * 2.2 + lowFlowTime) * Math.PI) *
        Math.cos((crossCoordinate * 1.7 - lowFlowTime) * Math.PI);
      const highWave = Math.sin((waveCoordinate * 2.2 + highFlowTime) * Math.PI) *
        Math.cos((crossCoordinate * 1.7 - highFlowTime) * Math.PI);
      const wave = lowWave + (highWave - lowWave) * cycleMix.blend;
      const radial = 1 - Math.min(1, Math.hypot(localX, localY) / 0.9);
      const loopNoise = loopOscillation(loopProgress, cycleMix) * 100;
      let depth = clampValue(0.45 + wave * 0.22 + radial * 0.35 + asciiHash(column, row, loopNoise) * 0.18);
      depth = clampValue((depth - 0.5) * depthContrast + 0.5);
      const tone = clampValue((luminance - 0.5) * contrast + 0.5 + brightness);
      let mapped = mode === "depth" ? depth : mode === "hybrid" ? tone * (1 - depthStrength) + depth * depthStrength : tone;
      if (values["ascii.invert"] === true) {
        mapped = 1 - mapped;
      }
      const jittered = clampValue(mapped + (asciiHash(column, row, 0) - 0.5) * jitter * 0.45);
      const character = charset[Math.min(charset.length - 1, Math.floor(jittered * charset.length))] ?? " ";
      let ink = sourceColor;
      if (textMode) {
        const primary = parseHexColor(colorValue(values, "ascii.textColor", "#D8FF65"), [216, 255, 101]);
        const accent = parseHexColor(colorValue(values, "ascii.textAccent", "#FF2896"), [255, 40, 150]);
        const gradientAmount = stringValue(values, "ascii.textColorMode", "gradient") === "gradient"
          ? clampValue(column / Math.max(1, columns - 1) + wave * 0.12)
          : 0;
        ink = mixRgb(primary, accent, gradientAmount);
      } else if (colorMode === "custom") {
        ink = foreground;
      } else if (colorMode === "gradient") {
        ink = mixRgb(foreground, [255, 40, 150], mapped * 0.72);
      }
      context.fillStyle = `rgb(${ink.map((channel) => Math.round(channel)).join(",")})`;
      context.globalAlpha = textMode ? clampValue(alpha * 1.4, 0.15, 1) : 1;
      context.fillText(character, column * cellWidth + cellWidth * 0.5, row * cellHeight + cellHeight * 0.5);
    }
  }

  context.globalAlpha = 1;
}

export function AsciiImageCanvas({
  asset,
  store,
}: {
  asset: ToolcraftMediaAsset;
  store: ToolcraftStore;
}): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [buffer] = React.useState(() => document.createElement("canvas"));
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const lastRenderedTimestampRef = React.useRef(Number.NEGATIVE_INFINITY);
  const renderRef = React.useRef<(timeSeconds: number) => void>(() => undefined);
  const pendingTimeRef = React.useRef(0);
  const rafIdRef = React.useRef<number | null>(null);
  const scheduleRender = React.useCallback((timeSeconds: number) => {
    pendingTimeRef.current = timeSeconds;
    if (rafIdRef.current !== null) return;

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      renderRef.current(pendingTimeRef.current);
    });
  }, []);

  React.useEffect(() => {
    renderRef.current = (timeSeconds) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (canvas && image) {
        const values = store.getEvaluatedValues();
        const durationSeconds = store.getState().timeline.durationSeconds;
        renderAsciiSource(
          canvas,
          buffer,
          image,
          image.naturalWidth || image.width || 1,
          image.naturalHeight || image.height || 1,
          values,
          timeSeconds * 1_000,
          durationSeconds,
        );
      }
    };
    scheduleRender(store.getPlayhead());
  }, [buffer, scheduleRender, store]);

  React.useEffect(() => {
    const image = new Image();
    image.addEventListener("load", () => {
      imageRef.current = image;
      scheduleRender(store.getPlayhead());
    }, { once: true });
    image.src = asset.dataUrl;
    return () => {
      imageRef.current = null;
    };
  }, [asset.dataUrl, scheduleRender, store]);

  React.useEffect(() => {
    return store.subscribePlayhead((timeSeconds, timestamp) => {
      const values = store.getEvaluatedValues();
      const requestedFps = Number(values["performance.fps"] ?? 30);
      const frameInterval = 1_000 / Math.max(1, Math.min(60, requestedFps));

      if (timestamp - lastRenderedTimestampRef.current < frameInterval - 0.5) {
        return;
      }

      lastRenderedTimestampRef.current = timestamp;
      scheduleRender(timeSeconds);
    });
  }, [scheduleRender, store]);

  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => scheduleRender(store.getPlayhead()));
    return () => {
      unsubscribe();
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [scheduleRender, store]);

  return <canvas className="absolute inset-0 h-full w-full" data-toolcraft-ascii-lab-canvas="true" ref={canvasRef} />;
}

export function AsciiTextCanvas({
  store,
}: {
  store: ToolcraftStore;
}): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [buffer] = React.useState(() => document.createElement("canvas"));
  const [textSource] = React.useState(() => document.createElement("canvas"));
  const lastRenderedTimestampRef = React.useRef(Number.NEGATIVE_INFINITY);
  const renderRef = React.useRef<(timeSeconds: number) => void>(() => undefined);
  const pendingTimeRef = React.useRef(0);
  const rafIdRef = React.useRef<number | null>(null);
  const scheduleRender = React.useCallback((timeSeconds: number) => {
    pendingTimeRef.current = timeSeconds;
    if (rafIdRef.current !== null) return;

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      renderRef.current(pendingTimeRef.current);
    });
  }, []);

  React.useEffect(() => {
    renderRef.current = (timeSeconds) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const values = store.getEvaluatedValues();
      const durationSeconds = store.getState().timeline.durationSeconds;
      const renderScale = numberValue(values, "canvas.renderScale", 1);
      const outputWidth = Math.max(1, Math.round(1280 * renderScale));
      const outputHeight = Math.max(1, Math.round(720 * renderScale));
      renderTextSource(
        textSource,
        outputWidth,
        outputHeight,
        values,
        timeSeconds * 1_000,
        durationSeconds,
      );
      renderAsciiSource(
        canvas,
        buffer,
        textSource,
        textSource.width,
        textSource.height,
        values,
        timeSeconds * 1_000,
        durationSeconds,
        true,
      );
    };
    scheduleRender(store.getPlayhead());
  }, [buffer, scheduleRender, store, textSource]);

  React.useEffect(() => {
    return store.subscribePlayhead((timeSeconds, timestamp) => {
      const values = store.getEvaluatedValues();
      const requestedFps = Number(values["performance.fps"] ?? 30);
      const frameInterval = 1_000 / Math.max(1, Math.min(60, requestedFps));

      if (timestamp - lastRenderedTimestampRef.current < frameInterval - 0.5) return;
      lastRenderedTimestampRef.current = timestamp;
      scheduleRender(timeSeconds);
    });
  }, [scheduleRender, store]);

  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => scheduleRender(store.getPlayhead()));
    return () => {
      unsubscribe();
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [scheduleRender, store]);

  return <canvas className="absolute inset-0 h-full w-full" data-toolcraft-ascii-lab-canvas="true" ref={canvasRef} />;
}
