import * as React from "react";

import {
  createToolcraftPngExportCanvas,
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

import fragmentShader from "./fragment.glsl?raw";
import styles from "./gradient-renderer.module.css";
import vertexShader from "./vertex.glsl?raw";

type GradientStop = { color: string; opacity?: number; position: string | number };
type GradientValue = { angle: number; gradientType: "linear" | "radial" | "angular" | "diamond"; stops: GradientStop[] };

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
type GradientRendererHandle = { gl: WebGL2RenderingContext; program: WebGLProgram };
const rendererCache = new WeakMap<HTMLCanvasElement, GradientRendererHandle>();

function getRenderer(canvas: HTMLCanvasElement): GradientRendererHandle {
  const cached = rendererCache.get(canvas);
  if (cached) return cached;
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
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
  const handle = { gl, program };
  rendererCache.set(canvas, handle);
  return handle;
}

function drawGradient(canvas: HTMLCanvasElement, state: ToolcraftState, time: number, includeBackground: boolean): void {
  const { gl, program } = getRenderer(canvas);
  gl.useProgram(program);
  const uniform1f = (name: string, value: number) => gl.uniform1f(gl.getUniformLocation(program, name), value);
  const gradient = gradientValue(state);
  const types = { linear: 0, radial: 1, angular: 2, diamond: 3 } as const;
  gl.uniform2f(gl.getUniformLocation(program, "resolution"), canvas.width, canvas.height);
  gl.uniform1i(gl.getUniformLocation(program, "gradientType"), types[gradient.gradientType] ?? 0);
  gl.uniform1i(gl.getUniformLocation(program, "includeBackground"), includeBackground ? 1 : 0);
  uniform1f("time", time); uniform1f("seed", numberValue(state, "gradient.seed", 37) * 0.071); uniform1f("angle", gradient.angle * Math.PI / 180);
  uniform1f("spread", numberValue(state, "gradient.spread", 68) / 100);
  uniform1f("scale", 0.55 + numberValue(state, "gradient.scale", 46) / 100 * 1.65);
  uniform1f("density", 0.55 + numberValue(state, "gradient.density", 52) / 100 * 2.25);
  uniform1f("distortion", 0.15 + numberValue(state, "gradient.warp", 42) / 100 * 1.85);
  uniform1f("detail", numberValue(state, "gradient.detail", 38) / 100);
  uniform1f("softness", numberValue(state, "gradient.softness", 72) / 100); uniform1f("negativeSpace", numberValue(state, "gradient.negativeSpace", 80) / 100);
  uniform1f("contrast", numberValue(state, "tone.contrast", 108) / 100); uniform1f("brightness", numberValue(state, "tone.brightness", 102) / 100);
  uniform1f("saturation", numberValue(state, "tone.saturation", 118) / 100); uniform1f("grain", numberValue(state, "texture.grain", 3) / 100);
  uniform1f("grainSize", numberValue(state, "texture.grainSize", 2)); uniform1f("vignette", numberValue(state, "texture.vignette", 14) / 100);
  const background = rgb(String(state.values["appearance.background"] ?? "#050505"));
  gl.uniform3f(gl.getUniformLocation(program, "backgroundColor"), ...background);
  const stops = [...gradient.stops].sort((a, b) => stopPosition(a) - stopPosition(b)).slice(0, 8);
  const packed = new Float32Array(32);
  stops.forEach((stop, index) => packed.set([...rgb(stop.color), stopPosition(stop)], index * 4));
  gl.uniform1i(gl.getUniformLocation(program, "stopCount"), stops.length);
  gl.uniform4fv(gl.getUniformLocation(program, "stops[0]"), packed);
  gl.viewport(0, 0, canvas.width, canvas.height); gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function GradientRenderer() {
  const { state } = useToolcraft();
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });

  return (
    <InnerGradientRenderer
      values={state.values}
      includeBackground={includeBackground}
    />
  );
}

const InnerGradientRenderer = React.memo(function InnerGradientRenderer({
  values,
  includeBackground,
}: {
  values: Record<string, unknown>;
  includeBackground: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const renderState = React.useMemo(() => ({ values } as ToolcraftState), [values]);

  const renderStateRef = React.useRef(renderState);
  const includeBackgroundRef = React.useRef(includeBackground);
  const visibleTimeRef = React.useRef(0);

  React.useEffect(() => {
    renderStateRef.current = renderState;
    includeBackgroundRef.current = includeBackground;
  }, [renderState, includeBackground]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && values["motion.animate"] === false) {
      drawGradient(canvas, renderState, visibleTimeRef.current, includeBackground);
    }
  }, [renderState, includeBackground, values]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    let last = performance.now();

    const updateSize = (rect: DOMRectReadOnly | Omit<DOMRect, "toJSON">) => {
      const scale = Math.min(1.5, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const render = (now = performance.now()) => {
      const currentState = renderStateRef.current;
      if (currentState.values["motion.animate"] !== false) {
        visibleTimeRef.current += (now - last) / 1000 * (numberValue(currentState, "motion.speed", 32) / 32);
      }
      last = now;
      drawGradient(canvas, currentState, visibleTimeRef.current, includeBackgroundRef.current);
      if (currentState.values["motion.animate"] !== false) {
        frame = requestAnimationFrame(render);
      }
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateSize(entry.contentRect);
        cancelAnimationFrame(frame);
        render();
      }
    });
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div className={styles.output} data-toolcraft-product-output><canvas ref={canvasRef} className={styles.field} /></div>;
});

export function renderGradientToCanvas(context: CanvasRenderingContext2D, state: ToolcraftState, includeBackground: boolean): void {
  const output = document.createElement("canvas"); output.width = context.canvas.width; output.height = context.canvas.height;
  drawGradient(output, state, 0, includeBackground);
  // The Toolcraft export helper scales its 2D context for CSS-oriented renderers.
  // This shader already renders at the final pixel resolution, so draw it 1:1.
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.drawImage(output, 0, 0);
}
export async function exportGradient(state: ToolcraftState): Promise<void> {
  const includeBackground = state.values["export.includeBackground"] !== false;
  const resolution = String(state.values["export.image.resolution"] ?? "4k");
  const format = String(state.values["export.image.format"] ?? "png");
  const canvas = createToolcraftPngExportCanvas({ background: String(state.values["appearance.background"] ?? "#050505"), includeBackground, resolution, state, render: ({ context }) => renderGradientToCanvas(context, state, includeBackground) });
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Image export failed.")), mime, .96));
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url;
  link.download = `gradient-generator.${format === "jpg" ? "jpg" : "png"}`; link.click(); URL.revokeObjectURL(url);
}
