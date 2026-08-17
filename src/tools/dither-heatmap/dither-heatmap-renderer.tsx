import * as React from "react";
import { isToolcraftCanvasNavigationActive } from "@/toolcraft/runtime/react/canvas/canvas-navigation-performance";
import { Heatmap, ShaderMount } from "@paper-design/shaders-react";
import type { PaperShaderElement } from "@paper-design/shaders";
import { DitheringTypes, getShaderColorFromString, HalftoneDotsGrids, halftoneDotsFragmentShader, HalftoneDotsTypes, imageDitheringFragmentShader, ShaderFitOptions } from "@paper-design/shaders";

import { shouldIncludeToolcraftPreviewBackground } from "@/toolcraft/runtime/export/export";
import { toolcraftStateWithoutViewportMatches, useToolcraftSelector, useToolcraftStore } from "@/toolcraft/runtime/react/app-shell/use-toolcraft";
import type { ToolcraftMediaAsset, ToolcraftState } from "@/toolcraft/runtime/state/types";

type PaletteStop = { color: unknown; position: string | number };
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

function colorValue(state: ToolcraftState, target: string, fallback: string): string {
  const value = state.values[target];
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "hex" in value && typeof value.hex === "string") return value.hex;
  return fallback;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((item) => item + item).join("") : clean.padEnd(6, "0").slice(0, 6);
  return [0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16)) as [number, number, number];
}

function stopColor(value: unknown, fallback = "#ffffff"): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "hex" in value && typeof value.hex === "string") return value.hex;
  return fallback;
}

function mixColor(a: [number, number, number], b: [number, number, number], amount: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount];
}

function hash(x: number, y: number, phase: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + Math.cos(phase) * 31.71 + Math.sin(phase) * 19.19) * 43758.5453;
  return value - Math.floor(value);
}

function booleanValue(state: ToolcraftState, target: string, fallback: boolean): boolean {
  const value = state.values[target];
  return typeof value === "boolean" ? value : fallback;
}

function animationPhase(state: ToolcraftState): number {
  if (!booleanValue(state, "animation.enabled", true)) return 0;
  const duration = Math.max(.001, state.timeline.durationSeconds);
  const cycles = Math.max(1, Math.round(numberValue(state, "animation.cycles", 1)));
  return (state.timeline.currentTimeSeconds / duration) * Math.PI * 2 * cycles;
}

function motionCoordinate(x: number, y: number, width: number, height: number, state: ToolcraftState): number {
  const nx = x / Math.max(1, width) - .5;
  const ny = y / Math.max(1, height) - .5;
  const direction = stringValue(state, "animation.direction", "right");
  if (direction === "left") return -nx;
  if (direction === "down") return ny;
  if (direction === "up") return -ny;
  if (direction === "diagonalDown") return (nx + ny) * .707;
  if (direction === "diagonalUp") return (nx - ny) * .707;
  if (direction === "radial") return Math.hypot(nx, ny);
  if (direction === "vortex") return Math.atan2(ny, nx) / (Math.PI * 2) + Math.hypot(nx, ny) * .7;
  return nx;
}

function positionValue(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? clamp(parsed / 100) : 0;
}

function paletteColors(state: ToolcraftState): [number, number, number][] {
  const value = state.values["heatmap.palette"];
  const fallback = ["#15002D", "#3C2E9D", "#E63151", "#FF9F43", "#FFE98A"];
  if (!value || typeof value !== "object" || !("stops" in value) || !Array.isArray(value.stops)) return fallback.map(hexToRgb);
  const stops = [...(value as PaletteValue).stops]
    .sort((a, b) => positionValue(a.position) - positionValue(b.position))
    .map((stop) => ({ color: hexToRgb(stopColor(stop.color)), position: positionValue(stop.position) }));
  if (stops.length === 0) return fallback.map(hexToRgb);
  if (stops.length === 1) return [stops[0].color, stops[0].color];

  // Paper accepts at most ten evenly spaced colors. Resampling preserves the
  // gradient editor's stop positions instead of merely forwarding stop colors.
  return Array.from({ length: 10 }, (_, index) => {
    const position = index / 9;
    const rightIndex = stops.findIndex((stop) => stop.position >= position);
    if (rightIndex <= 0) return stops[0].color;
    if (rightIndex === -1) return stops[stops.length - 1].color;
    const left = stops[rightIndex - 1];
    const right = stops[rightIndex];
    const distance = right.position - left.position;
    return mixColor(left.color, right.color, distance > 0 ? (position - left.position) / distance : 0);
  });
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
    context.fillStyle = colorValue(state, "appearance.background", "#0D0D11");
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function prepareGeneratedSource(context: CanvasRenderingContext2D, state: ToolcraftState, includeBackground: boolean): void {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  if (includeBackground) {
    context.fillStyle = colorValue(state, "appearance.background", "#0D0D11");
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  }
}

function fontFamily(value: string): string {
  if (value === "mono") return 'ui-monospace, "SFMono-Regular", Consolas, monospace';
  if (value === "serif") return 'Georgia, "Times New Roman", serif';
  return 'Inter, ui-sans-serif, system-ui, sans-serif';
}

function trackedTextWidth(context: CanvasRenderingContext2D, text: string, tracking: number): number {
  return context.measureText(text).width + Math.max(0, [...text].length - 1) * tracking;
}

function drawTrackedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number, stroke: boolean): void {
  let cursor = x - trackedTextWidth(context, text, tracking) / 2;
  for (const glyph of text) {
    if (stroke) context.strokeText(glyph, cursor, y);
    else context.fillText(glyph, cursor, y);
    cursor += context.measureText(glyph).width + tracking;
  }
}

function drawTextSource(context: CanvasRenderingContext2D, state: ToolcraftState, includeBackground: boolean, phase: number): void {
  prepareGeneratedSource(context, state, includeBackground);
  const { width, height } = context.canvas;
  const lines = stringValue(state, "source.text", "TOOLCRAFT").split(/\r?\n/).slice(0, 8);
  const size = Math.max(12, Math.min(width, height) * numberValue(state, "text.size", 34) / 100);
  const tracking = numberValue(state, "text.tracking", 2) * width / 1280;
  const lineHeight = size * numberValue(state, "text.lineHeight", .92);
  const motion = stringValue(state, "animation.textMotion", "float");
  const animated = booleanValue(state, "animation.enabled", true);
  const travel = numberValue(state, "animation.speed", 100) / 100;
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  if (animated && motion === "float") offsetY = Math.sin(phase) * height * .045 * travel;
  if (animated && motion === "orbit") { offsetX = Math.cos(phase) * width * .055 * travel; offsetY = Math.sin(phase) * height * .055 * travel; }
  if (animated && motion === "pulse") scale = 1 + Math.sin(phase) * .08 * travel;
  context.save();
  context.translate(width / 2 + offsetX, height / 2 + offsetY);
  context.scale(scale, scale);
  context.font = `${stringValue(state, "text.weight", "900")} ${size}px ${fontFamily(stringValue(state, "text.font", "sans"))}`;
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.fillStyle = "#fff";
  context.strokeStyle = "#fff";
  context.lineWidth = Math.max(2, size * .035);
  const style = stringValue(state, "text.style", "solid");
  const top = -(lines.length - 1) * lineHeight / 2;
  lines.forEach((line, index) => {
    const y = top + index * lineHeight;
    if (style !== "outline") drawTrackedText(context, line, 0, y, tracking, false);
    if (style !== "solid") drawTrackedText(context, line, 0, y, tracking, true);
  });
  context.restore();
}

function draw3dSource(context: CanvasRenderingContext2D, state: ToolcraftState, includeBackground: boolean, phase: number): void {
  prepareGeneratedSource(context, state, includeBackground);
  const { width, height } = context.canvas;
  const radius = Math.min(width, height) * numberValue(state, "three.scale", 58) / 200;
  const depth = numberValue(state, "three.depth", 62) / 100;
  const rotation = booleanValue(state, "animation.enabled", true) && booleanValue(state, "animation.rotateSource", true) ? phase : 0;
  const tilt = numberValue(state, "three.tilt", 24) * Math.PI / 180;
  const shape = stringValue(state, "three.shape", "torus");
  const wireframe = booleanValue(state, "three.wireframe", true);
  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(tilt * .25);
  if (shape === "sphere") {
    const gradient = context.createRadialGradient(-radius * .32 * Math.cos(rotation), -radius * .3, radius * .08, 0, 0, radius);
    gradient.addColorStop(0, "#fff"); gradient.addColorStop(clamp(.55 + depth * .18), "#888"); gradient.addColorStop(1, "#050505");
    context.fillStyle = gradient; context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fill();
    if (wireframe) {
      context.strokeStyle = `rgba(255,255,255,${.2 + depth * .45})`; context.lineWidth = Math.max(1, radius * .008);
      for (let i = -2; i <= 2; i += 1) { context.beginPath(); context.ellipse(0, 0, radius * Math.cos(i * .22), radius * .28, rotation + i * .2, 0, Math.PI * 2); context.stroke(); }
    }
  } else if (shape === "cube") {
    const vertices = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    const projected = vertices.map(([x, y, z]) => {
      const rx = x * Math.cos(rotation) - z * Math.sin(rotation);
      const rz = x * Math.sin(rotation) + z * Math.cos(rotation);
      const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
      const dz = y * Math.sin(tilt) + rz * Math.cos(tilt);
      const perspective = 1 / (1 + dz * .18);
      return [rx * radius * perspective * .72, ry * radius * perspective * .72, dz] as const;
    });
    const faces = [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]];
    faces.sort((a, b) => a.reduce((sum, i) => sum + projected[i][2], 0) - b.reduce((sum, i) => sum + projected[i][2], 0));
    faces.forEach((face) => {
      const shade = clamp(.28 + (face.reduce((sum, i) => sum + projected[i][2], 0) / 4 + 1) * .3 * depth);
      context.beginPath(); face.forEach((index, i) => i ? context.lineTo(projected[index][0], projected[index][1]) : context.moveTo(projected[index][0], projected[index][1])); context.closePath();
      context.fillStyle = `rgb(${shade * 255} ${shade * 255} ${shade * 255})`; context.fill();
      if (wireframe) { context.strokeStyle = "rgba(255,255,255,.9)"; context.lineWidth = Math.max(1, radius * .012); context.stroke(); }
    });
  } else {
    context.rotate(rotation);
    context.scale(1, .48 + Math.abs(Math.sin(tilt)) * .28);
    context.lineWidth = radius * (.28 + depth * .16);
    context.strokeStyle = "#888"; context.beginPath(); context.arc(0, 0, radius * .68, 0, Math.PI * 2); context.stroke();
    context.lineWidth = radius * (.12 + depth * .1); context.strokeStyle = "#fff"; context.beginPath(); context.arc(-radius * .08, -radius * .08, radius * .68, Math.PI * 1.05, Math.PI * 1.88); context.stroke();
    if (wireframe) { context.lineWidth = Math.max(1, radius * .012); context.strokeStyle = "rgba(255,255,255,.75)"; for (let i = 0; i < 12; i += 1) { context.beginPath(); context.arc(0, 0, radius * (.5 + i * .032), 0, Math.PI * 2); context.stroke(); } }
  }
  context.restore();
}

function renderDither(context: CanvasRenderingContext2D, state: ToolcraftState, phase: number): void {
  const image = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  const { data, width, height } = image;
  const colorA = hexToRgb(colorValue(state, "dither.colorA", "#F5D500"));
  const colorB = hexToRgb(colorValue(state, "dither.colorB", "#111116"));
  const colorC = hexToRgb(colorValue(state, "dither.colorC", "#F04D8C"));
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
      const baseTone = clamp((luminance - .5) * contrast + .5);
      const adjusted = booleanValue(state, "dither.inverted", false) ? 1 - baseTone : baseTone;
      const matrixX = Math.floor(x / blockSize) % 4;
      const matrixY = Math.floor(y / blockSize) % 4;
      const pattern = patternMode === "noise" ? hash(x, y, phase) : patternMode === "checker" ? ((matrixX + matrixY) % 2) * .32 : (BAYER_4[matrixY][matrixX] + .5) / 16;
      const coordinate = motionCoordinate(x, y, width, height, state);
      const waveScale = 4 + numberValue(state, "animation.scale", 34) * .22;
      const travel = numberValue(state, "animation.speed", 100) / 100;
      const animatedWave = booleanValue(state, "animation.enabled", true) ? Math.sin(coordinate * waveScale * Math.max(.05, travel) + phase) * numberValue(state, "animation.amplitude", 45) / 500 : 0;
      const tone = clamp(adjusted + (pattern - .5) * .24 + animatedWave - (threshold - 50) / 240);
      const quantized = Math.round(tone * (levels - 1)) / (levels - 1);
      let color: [number, number, number];
      if (colorMode === "original") color = [data[sampleIndex], data[sampleIndex + 1], data[sampleIndex + 2]].map((channel) => Math.round(channel / 255 * (levels - 1)) / (levels - 1) * 255) as [number, number, number];
      else if (colorMode === "grayscale") color = [quantized * 255, quantized * 255, quantized * 255];
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

function renderHeatmap(context: CanvasRenderingContext2D, state: ToolcraftState, phase: number): void {
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
    const coordinate = motionCoordinate(x, y, width, height, state);
    const travel = numberValue(state, "animation.speed", 100) / 100;
    const wave = Math.sin((directional + coordinate * .35 * Math.max(.05, travel)) * (20 + motion * .3) + phase) * .5 + .5;
    const noise = hash(x, y, phase);
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

const animatedImageDitheringFragmentShader = imageDitheringFragmentShader
  .replace("uniform float u_colorSteps;", "uniform float u_colorSteps;\nuniform float u_motion;\nuniform float u_time;")
  .replace(
    "vec2 ditheringNoiseUV = canvasPixelizedUV;",
    "float loopPhase = u_time;\n  vec2 animatedOffset = vec2(cos(loopPhase), sin(loopPhase)) * u_motion * 2.0;\n  vec2 ditheringNoiseUV = canvasPixelizedUV + animatedOffset * pxSize;\n  vec2 animatedBayerUV = pxSizeUV + animatedOffset;",
  )
  .replace("lum = u_inverted ? (1. - lum) : lum;", "lum = u_inverted ? (1. - lum) : lum;\n  lum = clamp(lum + sin(loopPhase + lum * 6.2831853) * u_motion * 0.16, 0.0, 1.0);")
  .replaceAll("getBayerValue(pxSizeUV,", "getBayerValue(animatedBayerUV,");

function AnimatedImageDithering({
  colorBack,
  colorFront,
  colorHighlight,
  colorSteps,
  fit,
  frame,
  image,
  inverted,
  motion,
  originalColors,
  offsetX,
  offsetY,
  originX,
  originY,
  rotation,
  scale,
  shaderRef,
  size,
  type,
  worldHeight,
  worldWidth,
}: {
  colorBack: string;
  colorFront: string;
  colorHighlight: string;
  colorSteps: number;
  fit: "contain" | "cover";
  frame: number;
  image: string;
  inverted: boolean;
  motion: number;
  originalColors: boolean;
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
  rotation: number;
  scale: number;
  shaderRef: React.RefObject<PaperShaderElement | null>;
  size: number;
  type: keyof typeof DitheringTypes;
  worldHeight: number;
  worldWidth: number;
}): React.JSX.Element {
  const uniforms = React.useMemo(() => ({
    u_colorBack: getShaderColorFromString(colorBack),
    u_colorFront: getShaderColorFromString(colorFront),
    u_colorHighlight: getShaderColorFromString(colorHighlight),
    u_colorSteps: colorSteps,
    u_fit: ShaderFitOptions[fit],
    u_image: image,
    u_inverted: inverted,
    u_motion: motion,
    u_offsetX: offsetX,
    u_offsetY: offsetY,
    u_originX: originX,
    u_originY: originY,
    u_originalColors: originalColors,
    u_pxSize: size,
    u_rotation: rotation,
    u_scale: scale,
    u_type: DitheringTypes[type],
    u_worldHeight: worldHeight,
    u_worldWidth: worldWidth,
  }), [colorBack, colorFront, colorHighlight, colorSteps, fit, image, inverted, motion, offsetX, offsetY, originX, originY, originalColors, rotation, scale, size, type, worldHeight, worldWidth]);
  return (
    <ShaderMount
      className="absolute inset-0 h-full w-full"
      fragmentShader={animatedImageDitheringFragmentShader}
      frame={frame}
      maxPixelCount={2_073_600}
      minPixelRatio={1}
      ref={shaderRef}
      speed={0}
      style={{ height: "100%", width: "100%" }}
      uniforms={uniforms}
      webGlContextAttributes={{ alpha: true, antialias: false, desynchronized: true, preserveDrawingBuffer: true }}
    />
  );
}

const animatedHalftoneDotsFragmentShader = halftoneDotsFragmentShader
  .replace("uniform float u_time;", "uniform float u_time;\nuniform float u_motion;")
  .replace(
    "vec2 uv = v_imageUV;\n  uv -= vec2(.5);\n  uv /= pad;",
    "vec2 uv = v_imageUV;\n  uv -= vec2(.5);\n  uv /= pad;\n  float loopPhase = u_time;\n  vec2 loopOffset = vec2(cos(loopPhase), sin(loopPhase)) * u_motion * 0.75;\n  uv += loopOffset;",
  )
  .replace(
    "float baseRadius = u_radius;",
    "float baseRadius = u_radius;\n  baseRadius *= 1.0 + sin(loopPhase + floor(uv.x) * 0.31 + floor(uv.y) * 0.23) * u_motion * 0.18;",
  )
  .replace(
    "vec2 grainUV = v_imageUV - .5;",
    "vec2 grainUV = v_imageUV - .5;\n  grainUV += vec2(cos(loopPhase), sin(loopPhase)) * u_motion * 0.035;",
  )
  .replace(
    "fragColor = vec4(color, opacity);",
    "vec3 flattenedColor = color + u_colorBack.rgb * (1.0 - opacity);\n  fragColor = vec4(flattenedColor, 1.0);",
  );

function AnimatedHalftoneDots({
  colorBack,
  colorFront,
  contrast,
  fit,
  frame,
  grainMixer,
  grainOverlay,
  grainSize,
  grid,
  image,
  inverted,
  motion,
  offsetX,
  offsetY,
  originX,
  originY,
  originalColors,
  radius,
  rotation,
  scale,
  shaderRef,
  size,
  type,
  worldHeight,
  worldWidth,
}: {
  colorBack: string; colorFront: string; contrast: number; fit: "contain" | "cover";
  frame: number; grainMixer: number; grainOverlay: number; grainSize: number;
  grid: keyof typeof HalftoneDotsGrids; image: string; inverted: boolean; motion: number;
  offsetX: number; offsetY: number; originX: number; originY: number; originalColors: boolean;
  radius: number; rotation: number; scale: number; shaderRef: React.RefObject<PaperShaderElement | null>;
  size: number; type: keyof typeof HalftoneDotsTypes; worldHeight: number; worldWidth: number;
}): React.JSX.Element {
  const uniforms = React.useMemo(() => ({
    u_colorBack: getShaderColorFromString(colorBack),
    u_colorFront: getShaderColorFromString(colorFront),
    u_contrast: contrast,
    u_fit: ShaderFitOptions[fit],
    u_grainMixer: grainMixer,
    u_grainOverlay: grainOverlay,
    u_grainSize: grainSize,
    u_grid: HalftoneDotsGrids[grid],
    u_image: image,
    u_inverted: inverted,
    u_motion: motion,
    u_offsetX: offsetX,
    u_offsetY: offsetY,
    u_originX: originX,
    u_originY: originY,
    u_originalColors: originalColors,
    u_radius: radius,
    u_rotation: rotation,
    u_scale: scale,
    u_size: size,
    u_type: HalftoneDotsTypes[type],
    u_worldHeight: worldHeight,
    u_worldWidth: worldWidth,
  }), [colorBack, colorFront, contrast, fit, grainMixer, grainOverlay, grainSize, grid, image, inverted, motion, offsetX, offsetY, originX, originY, originalColors, radius, rotation, scale, size, type, worldHeight, worldWidth]);

  return <ShaderMount
    className="absolute inset-0 h-full w-full"
    fragmentShader={animatedHalftoneDotsFragmentShader}
    frame={frame}
    maxPixelCount={2_073_600}
    minPixelRatio={1}
    ref={shaderRef}
    speed={0}
    style={{ height: "100%", width: "100%" }}
    uniforms={uniforms}
    webGlContextAttributes={{ alpha: false, antialias: false, desynchronized: true, preserveDrawingBuffer: true }}
  />;
}

function PaperGpuRenderer({ source }: { source: ToolcraftMediaAsset }): React.JSX.Element {
  const store = useToolcraftStore();
  const state = useToolcraftSelector(React.useCallback((snapshot) => snapshot, []), toolcraftStateWithoutViewportMatches);
  const shaderRef = React.useRef<PaperShaderElement>(null);
  const values = state.values;
  const effectMode = stringValue(state, "effect.mode", "dither");
  const duration = Math.max(.001, state.timeline.durationSeconds);
  const cycles = Math.max(1, Math.round(numberValue(state, "animation.cycles", 1)));
  const phaseForTime = React.useCallback((timeSeconds: number) => timeSeconds / duration * Math.PI * 2 * cycles, [cycles, duration]);

  React.useEffect(() => store.subscribePlayhead((timeSeconds) => {
    if (isToolcraftCanvasNavigationActive()) return;
    const mount = shaderRef.current?.paperShaderMount;
    if (!mount) return;
    const currentState = store.getState();
    const enabled = booleanValue(currentState, "animation.enabled", true);
    const phase = enabled ? phaseForTime(timeSeconds) : 0;
    mount.setFrame(phase * 1000);
  }), [phaseForTime, store]);

  const common = {
    className: "absolute inset-0 h-full w-full",
    fit: stringValue(state, "media.fit", "contain") === "cover" ? "cover" as const : "contain" as const,
    frame: (booleanValue(state, "animation.enabled", true) ? phaseForTime(store.getPlayhead()) : 0) * 1000,
    maxPixelCount: 2_073_600,
    minPixelRatio: 1,
    ref: shaderRef,
    speed: 0,
    style: { height: "100%", width: "100%" },
    webGlContextAttributes: { alpha: true, antialias: false, desynchronized: true, preserveDrawingBuffer: true },
  };

  if (effectMode === "heatmap") {
    return (
      <Heatmap
        {...common}
        angle={numberValue(state, "heatmap.angle", 0)}
        colorBack={colorValue(state, "heatmap.colorBack", "#0D0D11")}
        colors={paletteColors(state).map(([red, green, blue]) => `rgb(${red} ${green} ${blue})`)}
        contour={numberValue(state, "heatmap.contour", 45) / 100}
        image={source.dataUrl}
        innerGlow={numberValue(state, "heatmap.innerGlow", numberValue(state, "heatmap.glow", 58)) / 100}
        noise={numberValue(state, "heatmap.noise", 22) / 100}
        offsetX={numberValue(state, "heatmap.offsetX", 0)}
        offsetY={numberValue(state, "heatmap.offsetY", 0)}
        originX={numberValue(state, "heatmap.originX", 50) / 100}
        originY={numberValue(state, "heatmap.originY", 50) / 100}
        outerGlow={numberValue(state, "heatmap.outerGlow", numberValue(state, "heatmap.glow", 58)) / 100}
        rotation={numberValue(state, "heatmap.rotation", 0)}
        scale={numberValue(state, "heatmap.scale", 75) / 100}
        worldHeight={numberValue(state, "heatmap.worldHeight", 100) / 100}
        worldWidth={numberValue(state, "heatmap.worldWidth", 100) / 100}
      />
    );
  }

  if (effectMode === "halftone") {
    const halftoneType = stringValue(state, "halftone.type", "gooey");
    const halftoneGrid = stringValue(state, "halftone.grid", "hex");
    return (
      <AnimatedHalftoneDots
        colorBack={colorValue(state, "halftone.colorBack", "#F2F1E8")}
        colorFront={colorValue(state, "halftone.colorFront", "#2B2B2B")}
        contrast={numberValue(state, "halftone.contrast", 40) / 100}
        fit={common.fit}
        frame={common.frame}
        grainMixer={numberValue(state, "halftone.grainMixer", 20) / 100}
        grainOverlay={numberValue(state, "halftone.grainOverlay", 20) / 100}
        grainSize={numberValue(state, "halftone.grainSize", 50) / 100}
        grid={halftoneGrid === "square" ? "square" : "hex"}
        image={source.dataUrl}
        inverted={booleanValue(state, "halftone.inverted", false)}
        motion={booleanValue(state, "animation.enabled", true) ? numberValue(state, "halftone.motion", 45) / 100 : 0}
        offsetX={numberValue(state, "halftone.offsetX", 0)}
        offsetY={numberValue(state, "halftone.offsetY", 0)}
        originX={numberValue(state, "halftone.originX", 50) / 100}
        originY={numberValue(state, "halftone.originY", 50) / 100}
        originalColors={booleanValue(state, "halftone.originalColors", false)}
        radius={numberValue(state, "halftone.radius", 125) / 100}
        rotation={numberValue(state, "halftone.rotation", 0)}
        scale={numberValue(state, "halftone.scale", 100) / 100}
        shaderRef={shaderRef}
        size={numberValue(state, "halftone.size", 50) / 100}
        type={halftoneType === "classic" || halftoneType === "holes" || halftoneType === "soft" ? halftoneType : "gooey"}
        worldHeight={numberValue(state, "halftone.worldHeight", 100) / 100}
        worldWidth={numberValue(state, "halftone.worldWidth", 100) / 100}
      />
    );
  }

  const pattern = stringValue(state, "dither.pattern", "4x4");
  const type = pattern === "noise" ? "random" as const : pattern === "2x2" ? "2x2" as const : pattern === "8x8" ? "8x8" as const : "4x4" as const;
  const colorMode = stringValue(state, "dither.colorMode", "duotone");
  return <AnimatedImageDithering
    colorBack={colorValue(state, "dither.colorB", "#111116")}
    colorFront={colorValue(state, "dither.colorA", "#F5D500")}
    colorHighlight={colorValue(state, "dither.colorC", "#F04D8C")}
    colorSteps={Math.max(1, Math.min(7, Math.round(numberValue(state, "dither.posterize", 2))))}
    fit={common.fit}
    frame={common.frame}
    image={source.dataUrl}
    inverted={booleanValue(state, "dither.inverted", false)}
    motion={booleanValue(state, "animation.enabled", true) ? numberValue(state, "animation.amplitude", 45) / 100 : 0}
    originalColors={colorMode === "rgb" || colorMode === "original"}
    offsetX={numberValue(state, "dither.offsetX", 0)}
    offsetY={numberValue(state, "dither.offsetY", 0)}
    originX={numberValue(state, "dither.originX", 50) / 100}
    originY={numberValue(state, "dither.originY", 50) / 100}
    rotation={numberValue(state, "dither.rotation", 0)}
    scale={numberValue(state, "dither.scale", 100) / 100}
    shaderRef={shaderRef}
    size={numberValue(state, "dither.pixelSize", 5)}
    type={type}
    worldHeight={numberValue(state, "dither.worldHeight", 100) / 100}
    worldWidth={numberValue(state, "dither.worldWidth", 100) / 100}
  />;
}

function LegacyDitherHeatmapRenderer(): React.JSX.Element {
  const store = useToolcraftStore();
  const state = useToolcraftSelector(React.useCallback((snapshot) => snapshot, []), toolcraftStateWithoutViewportMatches);
  const source = selectedSource(state);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stateRef = React.useRef(state);
  const [status, setStatus] = React.useState("");
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) { setStatus("Canvas 2D is unavailable."); return; }
    let stopped = false;
    let animation = 0;
    let lastCommittedState: ToolcraftState | null = null;
    let lastRenderCostMs = 0;
    let lastRenderTimestamp = Number.NEGATIVE_INFINITY;
    const initialMode = stringValue(stateRef.current, "source.mode", "image");
    const isVideo = initialMode === "image" && Boolean(source && (source.mimeType?.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv)$/i.test(source.fileName)));
    const element: SourceElement | null = initialMode === "image" && source ? (isVideo ? document.createElement("video") : new Image()) : null;
    if (element instanceof HTMLVideoElement) { element.muted = true; element.loop = true; element.playsInline = true; element.preload = "auto"; }
    const render = (timestamp: number) => {
      if (stopped) return;
      if (isToolcraftCanvasNavigationActive()) {
        animation = requestAnimationFrame(render);
        return;
      }
      const committed = stateRef.current;
      const effectMode = stringValue(committed, "effect.mode", "dither");
      const patternMode = stringValue(committed, "dither.pattern", "ordered");
      const requiresTimelineFrames =
        committed.timeline.keyframeGroups.length > 0 ||
        booleanValue(committed, "animation.enabled", true) ||
        effectMode === "heatmap" ||
        patternMode === "noise" ||
        element instanceof HTMLVideoElement;
      const dynamic = committed.timeline.isPlaying && requiresTimelineFrames;
      const canvasWorld = canvas.closest<HTMLElement>("[data-toolcraft-canvas-world]");
      const viewportIsMoving = canvasWorld?.style.willChange === "transform";
      const adaptiveInterval = Math.min(100, Math.max(1_000 / 30, lastRenderCostMs * 1.5));
      const frameInterval = viewportIsMoving
        ? Math.max(1_000 / 20, adaptiveInterval)
        : adaptiveInterval;
      const stateChanged = committed !== lastCommittedState;

      if (!stateChanged && (!dynamic || timestamp - lastRenderTimestamp < frameInterval)) {
        animation = requestAnimationFrame(render);
        return;
      }

      const renderStartedAt = performance.now();
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
      const phase = animationPhase(current);
      const sourceMode = stringValue(current, "source.mode", "image");
      if (sourceMode === "text") drawTextSource(context, current, includeBackground, phase);
      else if (sourceMode === "3d") draw3dSource(context, current, includeBackground, phase);
      else if (element) drawSource(context, element, current, includeBackground);
      else prepareGeneratedSource(context, current, includeBackground);
      if (stringValue(current, "effect.mode", "dither") === "heatmap") renderHeatmap(context, current, phase);
      else renderDither(context, current, phase);
      lastCommittedState = committed;
      lastRenderTimestamp = timestamp;
      lastRenderCostMs = performance.now() - renderStartedAt;
      animation = requestAnimationFrame(render);
    };
    const readyEvent = element instanceof HTMLVideoElement ? "loadeddata" : "load";
    const ready = () => {
      canvas.width = Math.max(1, Math.round(stateRef.current.canvas.size.width));
      canvas.height = Math.max(1, Math.round(stateRef.current.canvas.size.height));
      setStatus("");
      render(performance.now());
    };
    const failed = () => setStatus("Media could not be loaded.");
    if (element && source) {
      element.addEventListener(readyEvent, ready, { once: true });
      element.addEventListener("error", failed, { once: true });
      element.src = source.dataUrl;
      if (element instanceof HTMLVideoElement) element.load();
    } else {
      ready();
    }
    return () => { stopped = true; cancelAnimationFrame(animation); element?.removeEventListener(readyEvent, ready); element?.removeEventListener("error", failed); if (element instanceof HTMLVideoElement) { element.pause(); element.removeAttribute("src"); element.load(); } };
  }, [source?.dataUrl, source?.fileName, source?.mimeType, source?.revision, state.values["source.mode"], store]);

  return (
    <div className="absolute inset-0 grid place-items-center bg-transparent" data-toolcraft-dither-heatmap-output="true" data-toolcraft-product-output>
      <canvas className="h-full w-full object-contain" data-toolcraft-dither-heatmap-canvas="true" ref={canvasRef} />
      {status ? <div className="absolute bottom-3 rounded-md bg-black/75 px-3 py-1.5 text-xs text-white">{status}</div> : null}
    </div>
  );
}

export function DitherHeatmapRenderer(): React.JSX.Element {
  const state = useToolcraftSelector(React.useCallback((snapshot) => snapshot, []), toolcraftStateWithoutViewportMatches);
  const source = selectedSource(state);
  const sourceMode = stringValue(state, "source.mode", "image");
  const isVideo = Boolean(source && (source.mimeType.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv)$/i.test(source.fileName)));
  if (sourceMode === "image" && source && !isVideo) {
    return <div className="absolute inset-0" data-toolcraft-dither-heatmap-output="true" data-toolcraft-product-output><PaperGpuRenderer source={source} /></div>;
  }
  return <LegacyDitherHeatmapRenderer />;
}
