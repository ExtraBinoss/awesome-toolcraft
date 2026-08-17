import * as React from "react";

import {
  shouldIncludeToolcraftPreviewBackground,
} from "@/toolcraft/runtime/export/export";
import { toolcraftStateWithoutViewportMatches, useToolcraftSelector, useToolcraftStore } from "@/toolcraft/runtime/react/app-shell/use-toolcraft";
import type { ToolcraftMediaAsset, ToolcraftState } from "@/toolcraft/runtime/state/types";
import { logToolLoad, logToolLoadDuration } from "@/tool-load-debug";
import { getFontPickerFontById } from "@/toolcraft/ui/components/controls/font-picker/font-catalog";

import fragmentShader from "./fragment.glsl?raw";
import styles from "./gradient-renderer.module.css";
import vertexShader from "./vertex.glsl?raw";

type GradientStop = { color: string; opacity?: number; position: string | number };
type GradientValue = { angle: number; gradientType: "linear" | "radial" | "angular" | "diamond"; stops: GradientStop[] };
type TextTypographyValue = {
  color?: string;
  fontId?: string;
  fontSize?: number;
  fontWeight?: string;
  letterSpacing?: string;
  lineHeight?: string;
  opacity?: number;
  textCase?: string;
};

const fallbackGradient: GradientValue = {
  angle: 135,
  gradientType: "linear",
  stops: [
    { color: "#6C3BFF", position: "0%" }, { color: "#FF4F9A", position: "34%" },
    { color: "#FF9B54", position: "67%" }, { color: "#3B82F6", position: "100%" },
  ],
};

function numberValue(state: ToolcraftState, target: string, fallback: number): number {
  const value = state.values[target];
  return typeof value === "number" ? value : fallback;
}
function stringValue(state: ToolcraftState, target: string, fallback: string): string {
  const value = state.values[target];
  return typeof value === "string" ? value : fallback;
}
function gradientValue(state: ToolcraftState): GradientValue {
  const value = state.values["gradient.fill"];
  return value && typeof value === "object" && "stops" in value ? value as GradientValue : fallbackGradient;
}
function stopPosition(stop: GradientStop): number {
  const value = typeof stop.position === "number" ? stop.position : Number.parseFloat(stop.position);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) / 100 : 0;
}
function rgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((v) => v + v).join("") : clean.padEnd(6, "0").slice(0, 6);
  return [0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16) / 255) as [number, number, number];
}
function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create gradient shader.");
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Gradient shader failed.");
  return shader;
}
type GradientRendererHandle = {
  gradientRef: GradientValue | null;
  gl: WebGL2RenderingContext;
  imageKey: string;
  imageSize: [number, number];
  imageTexture: WebGLTexture;
  locations: Map<string, WebGLUniformLocation | null>;
  packedStops: Float32Array;
  program: WebGLProgram;
  stopCount: number;
  textFillGradientRef: GradientValue | null;
  textFillPackedStops: Float32Array;
  textFillStopCount: number;
  textMaskCanvas: HTMLCanvasElement;
  textMaskKey: string;
  textMaskTexture: WebGLTexture;
  redraw: () => void;
};
const rendererCache = new WeakMap<HTMLCanvasElement, GradientRendererHandle>();

function getRenderer(canvas: HTMLCanvasElement): GradientRendererHandle {
  const cached = rendererCache.get(canvas);
  if (cached) return cached;
  const startedAt = performance.now();
  logToolLoad("renderer:webgl initialization:start");
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, desynchronized: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error("WebGL 2 is required to render procedural gradients.");
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create gradient program.");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShader));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Gradient program failed.");
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const textMaskTexture = gl.createTexture();
  if (!textMaskTexture) throw new Error("Unable to create text mask texture.");
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textMaskTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([255]));
  const imageTexture = gl.createTexture();
  if (!imageTexture) throw new Error("Unable to create image texture.");
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, imageTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  const handle: GradientRendererHandle = {
    gl,
    gradientRef: null,
    imageKey: "",
    imageSize: [1, 1],
    imageTexture,
    locations: new Map(),
    packedStops: new Float32Array(32),
    program,
    stopCount: 0,
    textFillGradientRef: null,
    textFillPackedStops: new Float32Array(32),
    textFillStopCount: 0,
    textMaskCanvas: document.createElement("canvas"),
    textMaskKey: "",
    textMaskTexture,
    redraw: () => undefined,
  };
  rendererCache.set(canvas, handle);
  logToolLoadDuration("renderer:webgl initialization:end", startedAt);
  return handle;
}

function imageAsset(state: ToolcraftState): ToolcraftMediaAsset | undefined {
  return state.mediaAssets.find((asset) => asset.sourceTarget === "image.source");
}

function updateImageTexture(handle: GradientRendererHandle, asset: ToolcraftMediaAsset | undefined): void {
  const key = asset ? `${asset.id}:${asset.revision ?? 0}:${asset.dataUrl}` : "none";
  if (handle.imageKey === key) return;
  handle.imageKey = key;
  handle.imageSize = [1, 1];
  const { gl } = handle;
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, handle.imageTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  if (!asset) return;

  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    if (handle.imageKey !== key) return;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, handle.imageTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    handle.imageSize = [image.naturalWidth || 1, image.naturalHeight || 1];
    handle.redraw();
  };
  image.src = asset.dataUrl;
}

function uniformLocation(handle: GradientRendererHandle, name: string): WebGLUniformLocation | null {
  if (!handle.locations.has(name)) {
    handle.locations.set(name, handle.gl.getUniformLocation(handle.program, name));
  }
  return handle.locations.get(name) ?? null;
}

function typographyValue(state: ToolcraftState): TextTypographyValue {
  const value = state.values["text.typography"];
  return value && typeof value === "object" ? value as TextTypographyValue : {};
}

function transformTextCase(text: string, textCase: string): string {
  if (textCase === "uppercase") return text.toUpperCase();
  if (textCase === "lowercase") return text.toLowerCase();
  if (textCase === "capitalize") return text.replace(/(^|\s)(\S)/g, (_, space: string, character: string) => space + character.toUpperCase());
  if (textCase === "titleCase") return text.toLowerCase().replace(/(^|\s)(\S)/g, (_, space: string, character: string) => space + character.toUpperCase());
  return text;
}

function drawTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baseline: number,
  tracking: number,
): void {
  const glyphs = Array.from(text);
  const widths = glyphs.map((glyph) => context.measureText(glyph).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, glyphs.length - 1) * tracking;
  let x = centerX - totalWidth / 2;
  glyphs.forEach((glyph, index) => {
    context.fillText(glyph, x, baseline);
    x += widths[index] + tracking;
  });
}

function updateTextMask(handle: GradientRendererHandle, canvas: HTMLCanvasElement, state: ToolcraftState): void {
  const { gl, textMaskCanvas, textMaskTexture } = handle;
  const typography = typographyValue(state);
  const fontEntry = getFontPickerFontById(typography.fontId ?? "inter");
  const text = transformTextCase(stringValue(state, "text.content", "TOOL\nCRAFT"), typography.textCase ?? "original");
  const family = fontEntry?.family ?? "Inter";
  const weight = typography.fontWeight ?? "800";
  const size = typeof typography.fontSize === "number" ? typography.fontSize : 180;
  const lineHeightValues: Record<string, number> = { loose: 2, none: 1, normal: 1.5, relaxed: 1.625, snug: 1.375, tight: 1.25 };
  const trackingValues: Record<string, number> = { tighter: -0.05, tight: -0.025, normal: 0, wide: 0.025, wider: 0.05, widest: 0.1 };
  const lineHeight = lineHeightValues[typography.lineHeight ?? "tight"] ?? 1.25;
  const tracking = trackingValues[typography.letterSpacing ?? "normal"] ?? 0;
  const key = [canvas.width, canvas.height, text, family, weight, size, lineHeight, tracking].join("|");
  if (handle.textMaskKey === key) return;

  textMaskCanvas.width = canvas.width;
  textMaskCanvas.height = canvas.height;
  const context = textMaskCanvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fff";
  context.textAlign = "left";
  context.textBaseline = "middle";
  const fontSize = Math.max(4, size * canvas.width / 1080);
  context.font = `${weight} ${fontSize}px "${family}", ui-sans-serif, system-ui, sans-serif`;
  const lines = text.split(/\r?\n/).slice(0, 8);
  const step = fontSize * lineHeight;
  const firstBaseline = canvas.height / 2 - (lines.length - 1) * step / 2;
  const letterSpacing = fontSize * tracking;
  lines.forEach((line, index) => drawTrackedText(context, line, canvas.width / 2, firstBaseline + index * step, letterSpacing));

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textMaskTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, textMaskCanvas);
  handle.textMaskKey = key;
}

function drawGradient(canvas: HTMLCanvasElement, state: ToolcraftState, time: number, includeBackground: boolean): void {
  const handle = getRenderer(canvas);
  const { gl, program } = handle;
  gl.useProgram(program);
  const uniform1f = (name: string, value: number) => gl.uniform1f(uniformLocation(handle, name), value);
  const gradient = gradientValue(state);
  const types = { linear: 0, radial: 1, angular: 2, diamond: 3 } as const;
  gl.uniform2f(uniformLocation(handle, "resolution"), canvas.width, canvas.height);
  gl.uniform1i(uniformLocation(handle, "gradientType"), types[gradient.gradientType] ?? 0);
  gl.uniform1i(uniformLocation(handle, "includeBackground"), includeBackground ? 1 : 0);
  const textMode = stringValue(state, "content.mode", "gradient") === "text";
  const imageMode = stringValue(state, "content.mode", "gradient") === "image";
  gl.uniform1i(uniformLocation(handle, "contentMode"), textMode ? 1 : imageMode ? 2 : 0);
  if (textMode) updateTextMask(handle, canvas, state);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, handle.textMaskTexture);
  gl.uniform1i(uniformLocation(handle, "textMask"), 0);
  uniform1f("textRelief", numberValue(state, "text.relief", 58) / 100);
  uniform1f("textBevel", numberValue(state, "text.bevel", 42) / 100);
  uniform1f("textDepth", numberValue(state, "text.depth", 28) / 100);
  uniform1f("textLightAngle", numberValue(state, "text.lightAngle", 315) * Math.PI / 180);
  uniform1f("textShadow", numberValue(state, "text.shadow", 48) / 100);
  uniform1f("textShine", numberValue(state, "text.shine", 36) / 100);
  const typography = typographyValue(state);
  gl.uniform3f(uniformLocation(handle, "textTint"), ...rgb(typography.color ?? "#FFFFFF"));
  uniform1f("textOpacity", Math.max(0, Math.min(100, typography.opacity ?? 100)) / 100);
  gl.uniform1i(uniformLocation(handle, "textFillEnabled"), state.values["text.fill.enabled"] === true ? 1 : 0);
  gl.uniform1i(uniformLocation(handle, "textFillMode"), stringValue(state, "text.fill.mode", "solid") === "gradient" ? 1 : 0);
  gl.uniform3f(uniformLocation(handle, "textFillColor"), ...rgb(stringValue(state, "text.fill.color", "#FFFFFF")));
  const textFillGradient = (() => {
    const value = state.values["text.fill.gradient"];
    return value && typeof value === "object" && "stops" in value ? value as GradientValue : {
      angle: 35,
      gradientType: "linear" as const,
      stops: [{ color: "#FFFFFF", position: "0%" }, { color: "#7DD3FC", position: "45%" }, { color: "#C084FC", position: "100%" }],
    };
  })();
  gl.uniform1i(uniformLocation(handle, "textFillType"), types[textFillGradient.gradientType] ?? 0);
  uniform1f("textFillAngle", textFillGradient.angle * Math.PI / 180);
  if (handle.textFillGradientRef !== textFillGradient) {
    handle.textFillPackedStops.fill(0);
    const textStops = [...textFillGradient.stops].sort((left, right) => stopPosition(left) - stopPosition(right)).slice(0, 8);
    textStops.forEach((stop, index) => handle.textFillPackedStops.set([...rgb(stop.color), stopPosition(stop)], index * 4));
    handle.textFillGradientRef = textFillGradient;
    handle.textFillStopCount = textStops.length;
  }
  gl.uniform1i(uniformLocation(handle, "textFillStopCount"), handle.textFillStopCount);
  gl.uniform4fv(uniformLocation(handle, "textFillStops[0]"), handle.textFillPackedStops);
  updateImageTexture(handle, imageMode ? imageAsset(state) : undefined);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, handle.imageTexture);
  gl.uniform1i(uniformLocation(handle, "imageTexture"), 1);
  gl.uniform2f(uniformLocation(handle, "imageSize"), handle.imageSize[0], handle.imageSize[1]);
  gl.uniform2f(uniformLocation(handle, "imageOffset"), numberValue(state, "image.x", 0) / 200, -numberValue(state, "image.y", 0) / 200);
  uniform1f("imageOpacity", numberValue(state, "image.opacity", 88) / 100);
  uniform1f("imageScale", numberValue(state, "image.scale", 100) / 100);
  uniform1f("imageFit", ({ contain: 0, cover: 1, stretch: 2 } as const)[stringValue(state, "image.fit", "contain") as "contain" | "cover" | "stretch"] ?? 0);
  uniform1f("imageBlend", ({ normal: 0, screen: 1, multiply: 2, overlay: 3 } as const)[stringValue(state, "image.blend", "normal") as "normal" | "screen" | "multiply" | "overlay"] ?? 0);
  uniform1f("time", time); uniform1f("seed", numberValue(state, "gradient.seed", 37) * 0.071); uniform1f("angle", gradient.angle * Math.PI / 180);
  uniform1f("motionAmount", numberValue(state, "motion.speed", 32) / 32);
  uniform1f("spread", numberValue(state, "gradient.spread", 68) / 100);
  uniform1f("gradientBlur", numberValue(state, "gradient.blur", 0) / 100);
  uniform1f("scale", 0.55 + numberValue(state, "gradient.scale", 46) / 100 * 1.65);
  uniform1f("density", 0.55 + numberValue(state, "gradient.density", 52) / 100 * 2.25);
  uniform1f("distortion", 0.15 + numberValue(state, "gradient.warp", 42) / 100 * 1.85);
  uniform1f("detail", numberValue(state, "gradient.detail", 38) / 100);
  uniform1f("softness", numberValue(state, "gradient.softness", 72) / 100); uniform1f("negativeSpace", numberValue(state, "gradient.negativeSpace", 80) / 100);
  uniform1f("contrast", numberValue(state, "tone.contrast", 108) / 100); uniform1f("brightness", numberValue(state, "tone.brightness", 102) / 100);
  uniform1f("saturation", numberValue(state, "tone.saturation", 118) / 100); uniform1f("grain", numberValue(state, "texture.grain", 3) / 100);
  uniform1f("grainSize", numberValue(state, "texture.grainSize", 2)); uniform1f("vignette", numberValue(state, "texture.vignette", 14) / 100);
  const background = rgb(String(state.values["appearance.background"] ?? "#050505"));
  gl.uniform3f(uniformLocation(handle, "backgroundColor"), ...background);
  if (handle.gradientRef !== gradient) {
    handle.packedStops.fill(0);
    const stops = [...gradient.stops].sort((a, b) => stopPosition(a) - stopPosition(b)).slice(0, 8);
    stops.forEach((stop, index) => handle.packedStops.set([...rgb(stop.color), stopPosition(stop)], index * 4));
    handle.gradientRef = gradient;
    handle.stopCount = stops.length;
  }
  gl.uniform1i(uniformLocation(handle, "stopCount"), handle.stopCount);
  gl.uniform4fv(uniformLocation(handle, "stops[0]"), handle.packedStops);
  gl.viewport(0, 0, canvas.width, canvas.height); gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function GradientRenderer() {
  const store = useToolcraftStore();
  const state = useToolcraftSelector(React.useCallback((snapshot) => snapshot, []), toolcraftStateWithoutViewportMatches);
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });

  return (
    <InnerGradientRenderer
      values={state.values}
      includeBackground={includeBackground}
      store={store}
    />
  );
}

const InnerGradientRenderer = React.memo(function InnerGradientRenderer({
  values,
  includeBackground,
  store,
}: {
  values: Record<string, unknown>;
  includeBackground: boolean;
  store: ReturnType<typeof useToolcraftStore>;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const includeBackgroundRef = React.useRef(includeBackground);
  const firstFrameLoggedRef = React.useRef(false);
  const renderCurrentFrameRef = React.useRef<() => void>(() => undefined);

  React.useEffect(() => {
    includeBackgroundRef.current = includeBackground;
    renderCurrentFrameRef.current();
  }, [includeBackground, values]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const updateSize = (rect: DOMRectReadOnly | Omit<DOMRect, "toJSON">) => {
      const scale = Math.min(1.5, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const renderAt = (timeSeconds: number) => {
      const committedState = store.getState();
      const currentState = committedState.timeline.keyframeGroups.length > 0
        ? { ...committedState, values: store.getEvaluatedValues(undefined, timeSeconds) }
        : committedState;
      const duration = Math.max(0.001, committedState.timeline.durationSeconds);
      const cycles = Math.max(1, Math.round(numberValue(currentState, "motion.cycles", 1)));
      const phase = currentState.values["motion.animate"] === false
        ? 0
        : (timeSeconds / duration) * Math.PI * 2 * cycles;
      drawGradient(canvas, currentState, phase, includeBackgroundRef.current);
      getRenderer(canvas).redraw = () => renderAt(store.getPlayhead());
      if (!firstFrameLoggedRef.current) {
        firstFrameLoggedRef.current = true;
        logToolLoad("renderer:first frame drawn");
      }
    };
    renderCurrentFrameRef.current = () => renderAt(store.getPlayhead());

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateSize(entry.contentRect);
        renderAt(store.getPlayhead());
      }
    });
    observer.observe(canvas);
    const unsubscribePlayhead = store.subscribePlayhead((timeSeconds) => renderAt(timeSeconds));
    renderAt(store.getPlayhead());

    return () => {
      observer.disconnect();
      unsubscribePlayhead();
      renderCurrentFrameRef.current = () => undefined;
    };
  }, [store]);

  return <div className={styles.output} data-toolcraft-product-output><canvas ref={canvasRef} className={styles.field} /></div>;
});
