import type { RuntimeEffect } from "@spidd/schema";
import { parseCssColor, rgba } from "../../../color";
import { bindFloatAttribute } from "../../../gl/attributes";
import { applyScissor, bindFramebufferViewport } from "../../../gl/framebuffer";
import { configureTexture2D, createColorFramebufferTarget } from "../../../gl/texture";
import type { OglRenderTarget } from "../../../materials/RenderTargetPool";
import { createProgram } from "../../../program";
import { ResourceTracker } from "../../../resources";
import type { OglEffectContext, OglEffectPass } from "../../EffectPass";
import type { ScissorRect } from "../../../render-graph/types";
import { BlobTrackCpuTracker } from "./BlobTrack.cpu";
import {
  BLOB_TRACK_BASE_HEIGHT,
  BLOB_TRACK_BASE_WIDTH,
  readBlobTrackConfig,
  type BlobTrackConfig,
} from "./BlobTrack.definitions";
import {
  BLOB_TRACK_BLUR_FRAGMENT,
  BLOB_TRACK_COPY_FRAGMENT,
  BLOB_TRACK_EDGE_FRAGMENT,
  BLOB_TRACK_FIELD_FRAGMENT,
  BLOB_TRACK_FINAL_FRAGMENT,
  BLOB_TRACK_MIX_FRAGMENT,
  BLOB_TRACK_SOURCE_FRAGMENT,
  BLOB_TRACK_VERTEX,
} from "./BlobTrack.shaders";
import { drawBlobTrackOverlay } from "./BlobTrack.overlay";

export class BlobTrackPass implements OglEffectPass {
  readonly type = "blob-track" as const;
  private readonly gl: WebGL2RenderingContext;
  private readonly resources: ResourceTracker;
  private width = BLOB_TRACK_BASE_WIDTH;
  private height = BLOB_TRACK_BASE_HEIGHT;
  private config: BlobTrackConfig = readBlobTrackConfig({});
  private readonly tracker = new BlobTrackCpuTracker(BLOB_TRACK_BASE_WIDTH, BLOB_TRACK_BASE_HEIGHT);
  private readonly pixels = { value: new Uint8Array(BLOB_TRACK_BASE_WIDTH * BLOB_TRACK_BASE_HEIGHT * 4) };
  private readonly canvas: HTMLCanvasElement;
  private readonly canvasContext: CanvasRenderingContext2D;
  private readonly overlayTexture: WebGLTexture;
  private targets: BlobTargets;
  private lastDetectionTime = 0;
  private backgroundModeActive = false;
  private hasBackground = false;
  private readonly sourcePass: BlobFullscreenPass;
  private readonly edgePass: BlobFullscreenPass;
  private readonly mixPass: BlobFullscreenPass;
  private readonly blurPass: BlobFullscreenPass;
  private readonly fieldPass: BlobFullscreenPass;
  private readonly backgroundPass: BlobFullscreenPass;
  private readonly finalPass: BlobFullscreenPass;

  constructor(gl: WebGL2RenderingContext, resources: ResourceTracker) {
    this.gl = gl;
    this.resources = resources;
    this.canvas = createCanvas(BLOB_TRACK_BASE_WIDTH, BLOB_TRACK_BASE_HEIGHT);
    this.canvasContext = requireCanvasContext(this.canvas);
    this.overlayTexture = resources.trackTexture(gl.createTexture());
    configureTexture2D(gl, this.overlayTexture);
    this.targets = this.createTargets(BLOB_TRACK_BASE_WIDTH, BLOB_TRACK_BASE_HEIGHT);
    this.sourcePass = new BlobFullscreenPass(gl, resources, "spidd-ogl-blob-source", BLOB_TRACK_SOURCE_FRAGMENT);
    this.edgePass = new BlobFullscreenPass(gl, resources, "spidd-ogl-blob-edge", BLOB_TRACK_EDGE_FRAGMENT);
    this.mixPass = new BlobFullscreenPass(gl, resources, "spidd-ogl-blob-mix", BLOB_TRACK_MIX_FRAGMENT);
    this.blurPass = new BlobFullscreenPass(gl, resources, "spidd-ogl-blob-blur", BLOB_TRACK_BLUR_FRAGMENT);
    this.fieldPass = new BlobFullscreenPass(gl, resources, "spidd-ogl-blob-field", BLOB_TRACK_FIELD_FRAGMENT);
    this.backgroundPass = new BlobFullscreenPass(gl, resources, "spidd-ogl-blob-background", BLOB_TRACK_COPY_FRAGMENT);
    this.finalPass = new BlobFullscreenPass(gl, resources, "spidd-ogl-blob-final", BLOB_TRACK_FINAL_FRAGMENT);
    this.uploadOverlay();
  }

  apply(source: OglRenderTarget, target: OglRenderTarget, effect: RuntimeEffect, context: OglEffectContext): void {
    this.config = readBlobTrackConfig(effect.properties);
    const width = Math.max(1, Math.round(BLOB_TRACK_BASE_WIDTH * this.config.resolutionScale));
    const height = Math.max(1, Math.round(BLOB_TRACK_BASE_HEIGHT * this.config.resolutionScale));
    if (width !== this.width || height !== this.height) this.resize(width, height);

    const usesBackground = this.config.maskMode === "background" || this.config.edgeSource === "background";
    if (!usesBackground) {
      this.backgroundModeActive = false;
      this.hasBackground = false;
    } else if (!this.backgroundModeActive) {
      this.backgroundModeActive = true;
      this.hasBackground = false;
    }

    if (this.backgroundModeActive && !this.hasBackground) {
      this.renderLocalPass(this.backgroundPass, this.targets.background, source.texture, context, bindNoop);
      this.hasBackground = true;
    }

    this.runGpu(source.texture, context);
    const now = currentMilliseconds(context);
    const detectionInterval = this.config.readEvery * (1000 / 60);
    if (now - this.lastDetectionTime >= detectionInterval) {
      this.detect();
      this.lastDetectionTime = now;
    }
    this.drawOverlay();
    this.uploadOverlay();
    this.renderFinal(source.texture, target, context);
  }

  destroy(): void {
    for (const target of Object.values(this.targets)) destroyTarget(this.gl, this.resources, target);
    this.resources.deleteTexture(this.gl, this.overlayTexture);
  }

  private runGpu(texture: WebGLTexture, context: OglEffectContext): void {
    this.renderLocalPass(this.sourcePass, this.targets.source, texture, context, (gl, program) => {
      bindTexture(gl, program, "uBackground", 1, this.targets.background.texture);
      gl.uniform1i(gl.getUniformLocation(program, "uMode"), modeIndex(this.config.maskMode));
      bindColor3(gl, program, "uKeyColor", this.config.keyColor);
      gl.uniform1f(gl.getUniformLocation(program, "uKeyTolerance"), this.config.keyTolerance);
      gl.uniform1f(gl.getUniformLocation(program, "uBackgroundGain"), this.config.backgroundGain);
      gl.uniform1f(gl.getUniformLocation(program, "uHasBackground"), this.hasBackground ? 1 : 0);
    });

    this.edgePass.render(this.targets.edge, this.width, this.height, (gl, program) => {
      bindTexture(gl, program, "uInput", 0, this.targets.source.texture);
      gl.uniform2f(gl.getUniformLocation(program, "uTexel"), 1 / this.width, 1 / this.height);
      gl.uniform1f(gl.getUniformLocation(program, "uGain"), this.config.edgeGain);
      gl.uniform1i(gl.getUniformLocation(program, "uSource"), edgeIndex(this.config.edgeSource));
    });

    this.mixPass.render(this.targets.mixed, this.width, this.height, (gl, program) => {
      bindTexture(gl, program, "uSource", 0, this.targets.source.texture);
      bindTexture(gl, program, "uEdge", 1, this.targets.edge.texture);
      gl.uniform1f(gl.getUniformLocation(program, "uAmount"), this.config.edgeAmount);
    });

    const radius = Math.round(this.config.blur);
    this.blurPass.render(this.targets.blurA, this.width, this.height, (gl, program) => {
      bindTexture(gl, program, "uInput", 0, this.targets.mixed.texture);
      gl.uniform2f(gl.getUniformLocation(program, "uTexel"), 1 / this.width, 1 / this.height);
      gl.uniform2f(gl.getUniformLocation(program, "uDirection"), 1, 0);
      gl.uniform1i(gl.getUniformLocation(program, "uRadius"), radius);
    });
    this.blurPass.render(this.targets.blurB, this.width, this.height, (gl, program) => {
      bindTexture(gl, program, "uInput", 0, this.targets.blurA.texture);
      gl.uniform2f(gl.getUniformLocation(program, "uTexel"), 1 / this.width, 1 / this.height);
      gl.uniform2f(gl.getUniformLocation(program, "uDirection"), 0, 1);
      gl.uniform1i(gl.getUniformLocation(program, "uRadius"), radius);
    });

    this.fieldPass.render(this.targets.field, this.width, this.height, (gl, program) => {
      bindTexture(gl, program, "uInput", 0, this.targets.blurB.texture);
      gl.uniform1f(gl.getUniformLocation(program, "uThreshold"), this.config.threshold);
      gl.uniform1f(gl.getUniformLocation(program, "uSoftness"), this.config.softness);
    });
  }

  private renderLocalPass(
    pass: BlobFullscreenPass,
    target: FixedTarget,
    texture: WebGLTexture,
    context: OglEffectContext,
    bindExtra: (gl: WebGL2RenderingContext, program: WebGLProgram) => void,
  ): void {
    pass.render(target, this.width, this.height, (gl, program) => {
      bindTexture(gl, program, "uTexture", 0, texture);
      bindEffectLocal(gl, program, context);
      bindExtra(gl, program);
    });
  }

  private renderFinal(texture: WebGLTexture, target: OglRenderTarget, context: OglEffectContext): void {
    this.finalPass.render(target, context.targetWidth, context.targetHeight, (gl, program) => {
      bindTexture(gl, program, "uTexture", 0, texture);
      bindTexture(gl, program, "uSourceDebug", 1, this.targets.source.texture);
      bindTexture(gl, program, "uEdge", 2, this.targets.edge.texture);
      bindTexture(gl, program, "uBlur", 3, this.targets.blurB.texture);
      bindTexture(gl, program, "uField", 4, this.targets.field.texture);
      bindTexture(gl, program, "uOverlay", 5, this.overlayTexture);
      gl.uniformMatrix3fv(gl.getUniformLocation(program, "uWorldToLocal"), false, context.effectSpace.worldToLocal);
      bindViewport(gl, program, context);
      gl.uniform2f(gl.getUniformLocation(program, "uLocalSize"), context.effectSpace.size[0], context.effectSpace.size[1]);
      gl.uniform2f(gl.getUniformLocation(program, "uRenderOriginPx"), context.renderOriginX, context.renderOriginY);
      gl.uniform1f(gl.getUniformLocation(program, "uHasBounds"), context.effectSpace.hasBounds ? 1 : 0);
      gl.uniform1i(gl.getUniformLocation(program, "uView"), viewIndex(this.config.view));
      gl.uniform1f(gl.getUniformLocation(program, "uMix"), this.config.mix);
    }, context.scissor);
  }

  private detect(): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets.field.framebuffer);
    gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, this.pixels.value);
    this.tracker.detect(this.pixels.value, {
      minArea: this.config.minArea,
      maxArea: this.config.maxArea,
      maxBlobs: this.config.maxBlobs,
      motionSmoothing: this.config.motionSmoothing,
      matchDistance: this.config.matchDistance,
    });
  }

  private drawOverlay(): void {
    drawBlobTrackOverlay(this.canvasContext, this.tracker.getTracks(), this.config, this.width, this.height);
  }

  private uploadOverlay(): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.overlayTexture);
    configureTexture2D(gl, this.overlayTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
  }

  private resize(width: number, height: number): void {
    for (const target of Object.values(this.targets)) destroyTarget(this.gl, this.resources, target);
    this.width = width;
    this.height = height;
    this.targets = this.createTargets(width, height);
    this.pixels.value = new Uint8Array(width * height * 4);
    this.tracker.resize(width, height);
    this.canvas.width = width;
    this.canvas.height = height;
    this.hasBackground = false;
    this.lastDetectionTime = 0;
    this.uploadOverlay();
  }

  private createTargets(width: number, height: number): BlobTargets {
    return {
      background: createTarget(this.gl, this.resources, width, height),
      source: createTarget(this.gl, this.resources, width, height),
      edge: createTarget(this.gl, this.resources, width, height),
      mixed: createTarget(this.gl, this.resources, width, height),
      blurA: createTarget(this.gl, this.resources, width, height),
      blurB: createTarget(this.gl, this.resources, width, height),
      field: createTarget(this.gl, this.resources, width, height),
    };
  }
}

class BlobFullscreenPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly positionLocation: number;

  constructor(gl: WebGL2RenderingContext, resources: ResourceTracker, label: string, fragment: string) {
    this.gl = gl;
    this.program = createProgram(gl, resources, { label, vertex: BLOB_TRACK_VERTEX, fragment });
    this.positionLocation = gl.getAttribLocation(this.program, "a_position");
    this.buffer = resources.trackBuffer(gl.createBuffer());
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  }

  render(
    target: FixedTarget | OglRenderTarget,
    width: number,
    height: number,
    bind: (gl: WebGL2RenderingContext, program: WebGLProgram) => void,
    scissor?: ScissorRect,
  ): void {
    const gl = this.gl;
    bindFramebufferViewport(gl, target.framebuffer, width, height);
    applyScissor(gl, scissor);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.useProgram(this.program);
    bindFloatAttribute(gl, this.positionLocation, this.buffer, 2);
    bind(gl, this.program);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.SCISSOR_TEST);
  }
}

interface FixedTarget {
  readonly texture: WebGLTexture;
  readonly framebuffer: WebGLFramebuffer;
  readonly width: number;
  readonly height: number;
}

interface BlobTargets {
  readonly background: FixedTarget;
  readonly source: FixedTarget;
  readonly edge: FixedTarget;
  readonly mixed: FixedTarget;
  readonly blurA: FixedTarget;
  readonly blurB: FixedTarget;
  readonly field: FixedTarget;
}

function createTarget(gl: WebGL2RenderingContext, resources: ResourceTracker, width: number, height: number): FixedTarget {
  const { texture, framebuffer } = createColorFramebufferTarget(gl, resources, width, height);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`OGL Blob Track framebuffer incomplete: ${status}`);
  return { texture, framebuffer, width, height };
}

function destroyTarget(gl: WebGL2RenderingContext, resources: ResourceTracker, target: FixedTarget): void {
  resources.deleteFramebuffer(gl, target.framebuffer);
  resources.deleteTexture(gl, target.texture);
}

function bindTexture(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, unit: number, texture: WebGLTexture): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(gl.getUniformLocation(program, name), unit);
}

function bindEffectLocal(gl: WebGL2RenderingContext, program: WebGLProgram, context: OglEffectContext): void {
  gl.uniformMatrix3fv(gl.getUniformLocation(program, "uLocalToWorld"), false, context.effectSpace.localToWorld);
  bindViewport(gl, program, context);
  gl.uniform2f(gl.getUniformLocation(program, "uLocalSize"), context.effectSpace.size[0], context.effectSpace.size[1]);
  gl.uniform1f(gl.getUniformLocation(program, "uHasBounds"), context.effectSpace.hasBounds ? 1 : 0);
}

function bindViewport(gl: WebGL2RenderingContext, program: WebGLProgram, context: OglEffectContext): void {
  gl.uniform2f(gl.getUniformLocation(program, "uResolution"), context.width, context.height);
  gl.uniform2f(gl.getUniformLocation(program, "uViewportCenter"), context.viewport.panX, -context.viewport.panY);
  gl.uniform2f(gl.getUniformLocation(program, "uRenderOriginPx"), context.renderOriginX, context.renderOriginY);
  gl.uniform2f(
    gl.getUniformLocation(program, "uTextureUvScale"),
    context.sourceWidth / Math.max(1, context.sourceTextureWidth),
    context.sourceHeight / Math.max(1, context.sourceTextureHeight),
  );
  gl.uniform1f(gl.getUniformLocation(program, "uPixelsPerWorldUnit"), context.viewport.zoom * context.viewport.dpr);
}

function bindColor3(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, value: string): void {
  const color = parseCssColor(value, rgba(1, 0.2, 0.333, 1));
  gl.uniform3f(gl.getUniformLocation(program, name), color.r, color.g, color.b);
}

function modeIndex(mode: string): number {
  return mode === "dark" ? 1 : mode === "key" ? 2 : mode === "background" ? 3 : 0;
}

function edgeIndex(mode: string): number {
  return mode === "luma" ? 1 : mode === "key" ? 2 : mode === "background" ? 3 : 0;
}

function viewIndex(view: string): number {
  return view === "source" ? 1 : view === "edge" ? 2 : view === "blurred" ? 3 : view === "mask" ? 4 : 0;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document === "undefined") throw new Error("Blob Track requires document.createElement.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function requireCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Blob Track requires a 2D canvas context.");
  return context;
}

function currentMilliseconds(context: OglEffectContext): number {
  if (context.viewport.timeSeconds !== undefined) return context.viewport.timeSeconds * 1000;
  if (typeof performance !== "undefined") return performance.now();
  return Date.now();
}

function bindNoop(): void {
  return undefined;
}
