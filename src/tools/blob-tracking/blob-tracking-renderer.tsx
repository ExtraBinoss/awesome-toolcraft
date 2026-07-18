"use client";

import * as React from "react";
import { useToolcraft } from "@/toolcraft/runtime/react";
import type { ToolcraftAssetLibraryItem } from "@/toolcraft/runtime/schema/types";
import type { ToolcraftMediaAsset, ToolcraftState } from "@/toolcraft/runtime/state/types";
import { BlobTrackCpuTracker, type BlobTrackTrack } from "./BlobTrack.cpu";
import { drawBlobTrackOverlay } from "./BlobTrack.overlay";
import {
  BLOB_TRACK_BLUR_FRAGMENT, BLOB_TRACK_EDGE_FRAGMENT, BLOB_TRACK_FIELD_FRAGMENT,
  BLOB_TRACK_FINAL_FRAGMENT, BLOB_TRACK_MASK_FRAGMENT, BLOB_TRACK_VERTEX,
} from "./BlobTrack.shaders";

export type BlobTrackingSource = { kind: "webcam" } | { kind: "media"; src: string; mediaType: "image" | "video" };

type GlProgram = { program: WebGLProgram; position: number };
type GlTarget = { framebuffer: WebGLFramebuffer; texture: WebGLTexture; width: number; height: number };

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type); if (!shader) throw new Error("Blob Tracking shader creation failed.");
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Blob Tracking shader compilation failed.");
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, fragment: string): GlProgram {
  const program = gl.createProgram(); if (!program) throw new Error("Blob Tracking program creation failed.");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, BLOB_TRACK_VERTEX)); gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Blob Tracking program linking failed.");
  return { program, position: gl.getAttribLocation(program, "a_position") };
}

function createTarget(gl: WebGL2RenderingContext, width: number, height: number): GlTarget {
  const texture = gl.createTexture(), framebuffer = gl.createFramebuffer(); if (!texture || !framebuffer) throw new Error("Blob Tracking framebuffer creation failed.");
  gl.bindTexture(gl.TEXTURE_2D, texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { framebuffer, texture, width, height };
}

function deleteTarget(gl: WebGL2RenderingContext, target: GlTarget | undefined): void { if (target) { gl.deleteFramebuffer(target.framebuffer); gl.deleteTexture(target.texture); } }
function numberValue(values: Record<string, unknown>, target: string, fallback: number): number { return typeof values[target] === "number" ? values[target] as number : fallback; }
function booleanValue(values: Record<string, unknown>, target: string, fallback: boolean): boolean { return typeof values[target] === "boolean" ? values[target] as boolean : fallback; }
function colorValue(values: Record<string, unknown>, target: string, fallback: string): string { return typeof values[target] === "string" ? values[target] as string : fallback; }
function parseRgb(color: string): [number, number, number] { const match = color.match(/^#?([\da-f]{6})$/i); if (!match) return [1, 1, 1]; return [0, 2, 4].map((i) => Number.parseInt(match[1].slice(i, i + 2), 16) / 255) as [number, number, number]; }
function sourceSize(element: HTMLImageElement | HTMLVideoElement): [number, number] { const media = element as HTMLVideoElement; return [media.videoWidth || (element as HTMLImageElement).naturalWidth || element.clientWidth || 16, media.videoHeight || (element as HTMLImageElement).naturalHeight || element.clientHeight || 16]; }

function sourceFromState(state: ToolcraftState, library: readonly ToolcraftAssetLibraryItem[]): BlobTrackingSource {
  const value = state.values["blob.source"];
  if (value && typeof value === "object" && "kind" in value) {
    const source = value as { assetId?: string; kind?: string; mediaType?: "image" | "video" };
    if (source.kind === "webcam") return { kind: "webcam" };
    const item = library.find((candidate) => candidate.value === source.assetId);
    if (source.kind === "library" && item) return { kind: "media", src: item.src, mediaType: item.kind };
    if (source.kind === "upload" && source.assetId) {
      const asset = state.mediaAssets.find((candidate) => candidate.id === source.assetId);
      if (asset) return { kind: "media", src: asset.dataUrl, mediaType: asset.assetKind === "image" ? "image" : "video" };
    }
  }
  const jellyfish = library.find((item) => item.value === "jellyfish");
  return jellyfish ? { kind: "media", src: jellyfish.src, mediaType: jellyfish.kind } : { kind: "media", src: "/baseAssets/videos/jellyfish.webm", mediaType: "video" };
}

function renderPass(gl: WebGL2RenderingContext, handle: GlProgram, target: GlTarget | null, width: number, height: number, setup: () => void): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null); gl.viewport(0, 0, width, height); gl.useProgram(handle.program); setup(); gl.bindBuffer(gl.ARRAY_BUFFER, null); gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function BlobTrackingRenderer({ library }: { library: readonly ToolcraftAssetLibraryItem[] }): React.JSX.Element {
  const { dispatch, state } = useToolcraft();
  const sourceValue = state.values["blob.source"];
  const source = React.useMemo(() => sourceFromState(state, library), [library, sourceValue, state.mediaAssets]);
  const valuesRef = React.useRef(state.values); valuesRef.current = state.values;
  const sourceRef = React.useRef(source); sourceRef.current = source;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const overlayRef = React.useRef<HTMLCanvasElement>(null);
  const compositeRef = React.useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    const canvas = canvasRef.current, overlay = overlayRef.current, composite = compositeRef.current;
    if (!canvas || !overlay || !composite) return undefined;
    let stopped = false, animation = 0, stream: MediaStream | undefined;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    const overlayContext = overlay.getContext("2d"); const compositeContext = composite.getContext("2d");
    if (!gl || !overlayContext || !compositeContext) { setStatus("WebGL2 is unavailable in this browser."); return undefined; }
    const sourceTexture = gl.createTexture(); if (!sourceTexture) { setStatus("Unable to create the media texture."); return undefined; }
    const overlayTexture = gl.createTexture(); if (!overlayTexture) { setStatus("Unable to create the overlay texture."); return undefined; }
    const maskProgram = createProgram(gl, BLOB_TRACK_MASK_FRAGMENT), blurProgram = createProgram(gl, BLOB_TRACK_BLUR_FRAGMENT), fieldProgram = createProgram(gl, BLOB_TRACK_FIELD_FRAGMENT), edgeProgram = createProgram(gl, BLOB_TRACK_EDGE_FRAGMENT), finalProgram = createProgram(gl, BLOB_TRACK_FINAL_FRAGMENT);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    let mask: GlTarget | undefined, blurH: GlTarget | undefined, blurV: GlTarget | undefined, field: GlTarget | undefined, edge: GlTarget | undefined;
    const tracker = new BlobTrackCpuTracker(320, 180); const pixels = new Uint8Array(320 * 180 * 4); let frameIndex = 0;
    const media = source.kind === "media" && source.mediaType === "image" ? new Image() : document.createElement("video");
    media.crossOrigin = "anonymous"; if (media instanceof HTMLVideoElement) { media.muted = true; media.loop = true; media.playsInline = true; }
    let ready = false;
    let sourceTextureUploaded = false;
    const uniformCache = new WeakMap<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
    const uniformLocation = (program: WebGLProgram, name: string): WebGLUniformLocation | null => {
      let locations = uniformCache.get(program);
      if (!locations) { locations = new Map(); uniformCache.set(program, locations); }
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
      return locations.get(name) ?? null;
    };
    const setupTexture = (texture: WebGLTexture, element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element); };
    const uniform1i = (program: WebGLProgram, name: string, value: number) => gl.uniform1i(uniformLocation(program, name), value);
    const uniform1f = (program: WebGLProgram, name: string, value: number) => gl.uniform1f(uniformLocation(program, name), value);
    const uniform2f = (program: WebGLProgram, name: string, x: number, y: number) => gl.uniform2f(uniformLocation(program, name), x, y);
    const bindTexture = (program: WebGLProgram, name: string, texture: WebGLTexture, unit: number) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture); uniform1i(program, name, unit); };
    const bindPosition = (handle: GlProgram) => { gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.enableVertexAttribArray(handle.position); gl.vertexAttribPointer(handle.position, 2, gl.FLOAT, false, 0, 0); };
    const draw = (now: number) => {
      if (stopped || !ready) return;
      const rect = canvas.getBoundingClientRect(), width = Math.max(1, Math.round(rect.width || state.canvas.size.width)), height = Math.max(1, Math.round(rect.height || state.canvas.size.height));
      const scale = Math.max(.25, Math.min(1, numberValue(valuesRef.current, "blob.resolutionScale", 1))); const detectWidth = Math.max(32, Math.round(320 * scale)), detectHeight = Math.max(18, Math.round(180 * scale));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; overlay.width = width; overlay.height = height; composite.width = width; composite.height = height; }
      if (!mask || mask.width !== detectWidth || mask.height !== detectHeight) { deleteTarget(gl, mask); deleteTarget(gl, blurH); deleteTarget(gl, blurV); deleteTarget(gl, field); deleteTarget(gl, edge); mask = createTarget(gl, detectWidth, detectHeight); blurH = createTarget(gl, detectWidth, detectHeight); blurV = createTarget(gl, detectWidth, detectHeight); field = createTarget(gl, detectWidth, detectHeight); edge = createTarget(gl, detectWidth, detectHeight); tracker.resize(detectWidth, detectHeight); pixels.fill(0); }
      const element = media as HTMLImageElement | HTMLVideoElement;
      if (element instanceof HTMLVideoElement || !sourceTextureUploaded) { setupTexture(sourceTexture, element); sourceTextureUploaded = true; }
      const [sw, sh] = sourceSize(element);
      bindPosition(maskProgram); renderPass(gl, maskProgram, mask ?? null, detectWidth, detectHeight, () => { bindTexture(maskProgram.program, "uTexture", sourceTexture, 0); uniform2f(maskProgram.program, "uSourceSize", sw, sh); uniform2f(maskProgram.program, "uOutputSize", detectWidth, detectHeight); uniform1i(maskProgram.program, "uMode", ({ luma: 0, dark: 1, key: 2, background: 3 } as Record<string, number>)[String(valuesRef.current["blob.maskMode"])] ?? 0); uniform1f(maskProgram.program, "uKeyTolerance", numberValue(valuesRef.current, "blob.keyTolerance", .32)); uniform1f(maskProgram.program, "uBackgroundGain", numberValue(valuesRef.current, "blob.backgroundGain", 3)); gl.uniform3f(uniformLocation(maskProgram.program, "uKeyColor"), ...parseRgb(colorValue(valuesRef.current, "blob.keyColor", "#ff3355"))); });
      bindPosition(blurProgram); renderPass(gl, blurProgram, blurH ?? null, detectWidth, detectHeight, () => { bindTexture(blurProgram.program, "uInput", mask!.texture, 0); uniform2f(blurProgram.program, "uTexel", 1 / detectWidth, 1 / detectHeight); uniform2f(blurProgram.program, "uDirection", 1, 0); uniform1i(blurProgram.program, "uRadius", Math.max(0, Math.min(8, Math.round(numberValue(valuesRef.current, "blob.blur", 1))))); });
      bindPosition(blurProgram); renderPass(gl, blurProgram, blurV ?? null, detectWidth, detectHeight, () => { bindTexture(blurProgram.program, "uInput", blurH!.texture, 0); uniform2f(blurProgram.program, "uTexel", 1 / detectWidth, 1 / detectHeight); uniform2f(blurProgram.program, "uDirection", 0, 1); uniform1i(blurProgram.program, "uRadius", Math.max(0, Math.min(8, Math.round(numberValue(valuesRef.current, "blob.blur", 1))))); });
      bindPosition(fieldProgram); renderPass(gl, fieldProgram, field ?? null, detectWidth, detectHeight, () => { bindTexture(fieldProgram.program, "uInput", blurV!.texture, 0); uniform1f(fieldProgram.program, "uThreshold", numberValue(valuesRef.current, "blob.threshold", .5)); uniform1f(fieldProgram.program, "uSoftness", numberValue(valuesRef.current, "blob.softness", .045)); });
      bindPosition(edgeProgram); renderPass(gl, edgeProgram, edge ?? null, detectWidth, detectHeight, () => { bindTexture(edgeProgram.program, "uInput", mask!.texture, 0); uniform2f(edgeProgram.program, "uTexel", 1 / detectWidth, 1 / detectHeight); uniform1f(edgeProgram.program, "uGain", numberValue(valuesRef.current, "blob.edgeGain", 4)); });
      if (frameIndex++ % Math.max(1, Math.round(numberValue(valuesRef.current, "blob.readEvery", 2))) === 0) { gl.bindFramebuffer(gl.FRAMEBUFFER, field!.framebuffer); gl.readPixels(0, 0, detectWidth, detectHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels); const tracks = tracker.detect(pixels, { minArea: numberValue(valuesRef.current, "blob.minArea", 10), maxArea: numberValue(valuesRef.current, "blob.maxArea", 1800), maxBlobs: numberValue(valuesRef.current, "blob.maxBlobs", 50), motionSmoothing: numberValue(valuesRef.current, "blob.motionSmoothing", .35), matchDistance: numberValue(valuesRef.current, "blob.matchDistance", 70) }); drawOverlay(overlayContext, tracks, width, height, detectWidth, detectHeight); }
      setupTexture(overlayTexture, overlay);
      bindPosition(finalProgram);
      renderPass(gl, finalProgram, null, width, height, () => { bindTexture(finalProgram.program, "uTexture", sourceTexture, 0); bindTexture(finalProgram.program, "uMask", mask!.texture, 1); bindTexture(finalProgram.program, "uEdge", edge!.texture, 2); bindTexture(finalProgram.program, "uBlur", blurV!.texture, 3); bindTexture(finalProgram.program, "uField", field!.texture, 4); bindTexture(finalProgram.program, "uOverlay", overlayTexture, 5); uniform2f(finalProgram.program, "uSourceSize", sw, sh); uniform2f(finalProgram.program, "uOutputSize", width, height); uniform1i(finalProgram.program, "uView", ({ final: 0, source: 1, edge: 2, blurred: 3, mask: 4 } as Record<string, number>)[String(valuesRef.current["blob.view"])] ?? 0); uniform1f(finalProgram.program, "uMix", numberValue(valuesRef.current, "blob.mix", 1)); });
      if (frameIndex % 2 === 0) { compositeContext.clearRect(0, 0, width, height); compositeContext.drawImage(canvas, 0, 0); compositeContext.drawImage(overlay, 0, 0); }
      animation = requestAnimationFrame(draw);
    };
    const drawOverlay = (ctx: CanvasRenderingContext2D, tracks: readonly BlobTrackTrack[], width: number, height: number, detectWidth: number, detectHeight: number) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, width, height); ctx.save(); ctx.translate(0, height); ctx.scale(width / detectWidth, -height / detectHeight); drawBlobTrackOverlay(ctx, tracks, { outlineColor: colorValue(valuesRef.current, "blob.outlineColor", "#ffffff"), trailColor: colorValue(valuesRef.current, "blob.trailColor", "#ff3355"), thickness: numberValue(valuesRef.current, "blob.thickness", 2) * detectWidth / 320, lineDistance: numberValue(valuesRef.current, "blob.lineDistance", 90), curve: numberValue(valuesRef.current, "blob.curve", .12), brackets: booleanValue(valuesRef.current, "blob.brackets", true), connections: booleanValue(valuesRef.current, "blob.connections", true), trails: booleanValue(valuesRef.current, "blob.trails", true), centerDots: booleanValue(valuesRef.current, "blob.centerDots", true), showIds: booleanValue(valuesRef.current, "blob.showIds", false), showMetrics: booleanValue(valuesRef.current, "blob.showMetrics", false) }, detectWidth, detectHeight); ctx.restore(); };
    const start = async () => {
      try {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        if (stopped) return;
        if (sourceRef.current.kind === "webcam") { if (!navigator.mediaDevices?.getUserMedia) throw new Error("Webcam access is unavailable."); stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user" } }); (media as HTMLVideoElement).srcObject = stream; await (media as HTMLVideoElement).play(); }
        else { media.src = sourceRef.current.src; await new Promise<void>((resolve, reject) => { media.addEventListener("loadeddata", () => resolve(), { once: true }); media.addEventListener("error", () => reject(new Error("Media could not be loaded.")), { once: true }); }); if (media instanceof HTMLVideoElement) await media.play().catch(() => undefined); }
        ready = true; setStatus(""); draw(performance.now());
      } catch (error) { if (sourceRef.current.kind === "webcam") dispatch({ history: "skip", target: "blob.source", type: "controls.setValue", value: { assetId: "jellyfish", kind: "library", mediaType: "video" } }); setStatus(error instanceof Error ? error.message : "Media could not be loaded."); }
    };
    void start();
    const resizeObserver = new ResizeObserver(() => { if (ready) draw(performance.now()); }); resizeObserver.observe(canvas);
    return () => { stopped = true; cancelAnimationFrame(animation); resizeObserver.disconnect(); stream?.getTracks().forEach((track) => track.stop()); gl.deleteTexture(sourceTexture); gl.deleteTexture(overlayTexture); [mask, blurH, blurV, field, edge].forEach((target) => deleteTarget(gl, target)); [maskProgram, blurProgram, fieldProgram, edgeProgram, finalProgram].forEach((handle) => gl.deleteProgram(handle.program)); gl.deleteBuffer(buffer); };
  }, [source]);

  return <div className="absolute inset-0 bg-black" data-toolcraft-product-output>
    <canvas className="absolute inset-0 h-full w-full" ref={canvasRef} />
    <canvas aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" ref={overlayRef} />
    <canvas aria-hidden="true" className="hidden" data-toolcraft-composite-canvas="true" ref={compositeRef} />
    {status ? <div className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded bg-black/70 px-3 py-1.5 text-xs text-white">{status}</div> : null}
  </div>;
}
