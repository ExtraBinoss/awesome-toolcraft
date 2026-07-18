import * as React from "react";

import {
  createToolcraftPngExportCanvas,
  shouldIncludeToolcraftPreviewBackground,
} from "@/toolcraft/runtime/export/export";
import { useToolcraft } from "@/toolcraft/runtime/react/app-shell/use-toolcraft";
import type { ToolcraftState } from "@/toolcraft/runtime/state/types";

import fragmentShader from "./fragment.glsl?raw";
import vertexShader from "./vertex.glsl?raw";

type PaletteStop = { color: string; opacity?: number; position: string | number };
type PaletteValue = { stops: PaletteStop[] };
type RendererHandle = { gl: WebGL2RenderingContext; program: WebGLProgram; locations: Record<string, WebGLUniformLocation | null> };

const rendererCache = new WeakMap<HTMLCanvasElement, RendererHandle>();

function numberValue(state: ToolcraftState, target: string, fallback: number): number {
  const value = state.values[target];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(state: ToolcraftState, target: string, fallback: string): string {
  const value = state.values[target];
  return typeof value === "string" ? value : fallback;
}

function rgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((value) => value + value).join("") : clean.padEnd(6, "0").slice(0, 6);
  return [0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16) / 255) as [number, number, number];
}

function paletteValue(state: ToolcraftState): PaletteValue {
  const value = state.values["suminagashi.palette"];
  if (value && typeof value === "object" && "stops" in value && Array.isArray(value.stops)) return value as PaletteValue;
  return { stops: [
    { color: "#101820", position: "0%" },
    { color: "#19647E", position: "25%" },
    { color: "#28AFB0", position: "52%" },
    { color: "#F4D35E", position: "76%" },
    { color: "#EE964B", position: "100%" },
  ] };
}

function positionValue(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) / 100 : 0;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create Suminagashi shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Suminagashi shader failed.");
  return shader;
}

function getRenderer(canvas: HTMLCanvasElement): RendererHandle {
  const cached = rendererCache.get(canvas);
  if (cached) return cached;
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error("WebGL 2 is required to render Suminagashi.");
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create Suminagashi program.");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShader));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Suminagashi program failed.");
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const names = ["resolution", "time", "seed", "pattern", "drops", "ringCount", "ringThickness", "dropScale", "flowAngle", "turbulence", "turbulenceScale", "swirl", "combStrength", "combSpacing", "inkOpacity", "paletteMix", "paperGrain", "paperWarmth", "contrast", "brightness", "speed", "invertPalette", "includeBackground", "stopCount", "stops[0]", "paperColor"];
  const locations = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
  const handle = { gl, program, locations };
  rendererCache.set(canvas, handle);
  return handle;
}

function drawSuminagashi(canvas: HTMLCanvasElement, state: ToolcraftState, time: number, includeBackground: boolean): void {
  const { gl, program, locations: l } = getRenderer(canvas);
  const palette = [...paletteValue(state).stops].sort((a, b) => positionValue(a.position) - positionValue(b.position)).slice(0, 8);
  const packed = new Float32Array(32);
  palette.forEach((stop, index) => packed.set([...rgb(stop.color), positionValue(stop.position)], index * 4));
  const patterns = { suminagashi: 0, stone: 1, bouquet: 2, combed: 3 } as const;
  const paper = rgb(stringValue(state, "suminagashi.paper", "#F3EBDD"));
  gl.useProgram(program);
  gl.uniform2f(l.resolution, canvas.width, canvas.height);
  gl.uniform1f(l.time, time);
  gl.uniform1f(l.seed, numberValue(state, "suminagashi.seed", 37));
  gl.uniform1i(l.pattern, patterns[stringValue(state, "suminagashi.pattern", "suminagashi") as keyof typeof patterns] ?? 0);
  gl.uniform1f(l.drops, numberValue(state, "suminagashi.drops", 8));
  gl.uniform1f(l.ringCount, numberValue(state, "suminagashi.ringCount", 28));
  gl.uniform1f(l.ringThickness, numberValue(state, "suminagashi.ringThickness", 58));
  gl.uniform1f(l.dropScale, numberValue(state, "suminagashi.dropScale", 46));
  gl.uniform1f(l.flowAngle, numberValue(state, "suminagashi.flowAngle", 18));
  gl.uniform1f(l.turbulence, numberValue(state, "suminagashi.turbulence", 24));
  gl.uniform1f(l.turbulenceScale, numberValue(state, "suminagashi.turbulenceScale", 42));
  gl.uniform1f(l.swirl, numberValue(state, "suminagashi.swirl", 35));
  gl.uniform1f(l.combStrength, numberValue(state, "suminagashi.combStrength", 12));
  gl.uniform1f(l.combSpacing, numberValue(state, "suminagashi.combSpacing", 34));
  gl.uniform1f(l.inkOpacity, numberValue(state, "suminagashi.inkOpacity", 76));
  gl.uniform1f(l.paletteMix, numberValue(state, "suminagashi.paletteMix", 72));
  gl.uniform1f(l.paperGrain, numberValue(state, "suminagashi.paperGrain", 12));
  gl.uniform1f(l.paperWarmth, numberValue(state, "suminagashi.paperWarmth", 58));
  gl.uniform1f(l.contrast, numberValue(state, "suminagashi.contrast", 108));
  gl.uniform1f(l.brightness, numberValue(state, "suminagashi.brightness", 102));
  gl.uniform1f(l.speed, numberValue(state, "motion.speed", 22));
  gl.uniform1f(l.invertPalette, state.values["suminagashi.invert"] === true ? 1 : 0);
  gl.uniform1i(l.includeBackground, includeBackground ? 1 : 0);
  gl.uniform1i(l.stopCount, palette.length);
  gl.uniform4fv(l["stops[0]"], packed);
  gl.uniform3f(l.paperColor, ...paper);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function SuminagashiRenderer(): React.JSX.Element {
  const { state } = useToolcraft();
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });
  const values = state.values;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stateRef = React.useRef(state);
  const includeBackgroundRef = React.useRef(includeBackground);
  const timeRef = React.useRef(0);
  const firstFrameRef = React.useRef(false);
  stateRef.current = state;
  includeBackgroundRef.current = includeBackground;
  const animate = values["motion.animate"] === true;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !animate) drawSuminagashi(canvas, state, 0, includeBackground);
  }, [state, includeBackground, values]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = (rect: DOMRectReadOnly) => {
      const scale = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
    };
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        resize(entry.contentRect);
        drawSuminagashi(canvas, stateRef.current, timeRef.current, includeBackgroundRef.current);
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !animate) return;
    let frame = 0;
    let previous = performance.now();
    const render = (now = performance.now()) => {
      const current = stateRef.current;
      timeRef.current += (now - previous) / 1000;
      previous = now;
      drawSuminagashi(canvas, current, timeRef.current, includeBackgroundRef.current);
      if (!firstFrameRef.current) firstFrameRef.current = true;
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  return <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "transparent" }} data-toolcraft-product-output><canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} /></div>;
}

export function renderSuminagashiToCanvas(context: CanvasRenderingContext2D, state: ToolcraftState, includeBackground: boolean): void {
  const output = document.createElement("canvas");
  output.width = context.canvas.width;
  output.height = context.canvas.height;
  drawSuminagashi(output, state, 0, includeBackground);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.drawImage(output, 0, 0);
}

export async function exportSuminagashi(state: ToolcraftState): Promise<void> {
  const includeBackground = state.values["export.includeBackground"] !== false;
  const format = String(state.values["export.image.format"] ?? "png");
  const resolution = String(state.values["export.image.resolution"] ?? "4k");
  const canvas = createToolcraftPngExportCanvas({
    background: stringValue(state, "suminagashi.paper", "#F3EBDD"),
    includeBackground,
    resolution,
    state,
    render: ({ context }) => renderSuminagashiToCanvas(context, state, includeBackground),
  });
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Suminagashi export failed.")), format === "jpg" ? "image/jpeg" : "image/png", 0.96));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `suminagashi.${format === "jpg" ? "jpg" : "png"}`;
  link.click();
  URL.revokeObjectURL(url);
}
