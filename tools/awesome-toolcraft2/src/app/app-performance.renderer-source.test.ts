import { describe, expect, it } from "vitest";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import {
  appPerformanceHasInteractionInvalidation,
  appPerformanceHasRenderPipelinePass,
  sourceCreatesWebGlContextInComponentRender,
  sourceMayUploadTextureFromTimelineDrivenEffect,
  sourceResyncsTimelineDurationFromRuntimeDuration,
  sourceUsesAnimationFrameWithoutCleanup,
  sourceUsesCpuPixelLoop,
  sourceUsesDirectStorageApi,
  sourceUsesGpuRenderer,
  sourceUsesLowResolutionPreviewUpscale,
  sourceUsesWebGlLifecycleGuard,
} from "./app-performance-test-utils";

describe("Toolcraft starter renderer source performance contract", () => {
  it("detects low-resolution preview upscale code paths", () => {
    expect(
      sourceUsesLowResolutionPreviewUpscale(`
        const maxPreviewPixels = 1_250_000;
        const previewScale = Math.sqrt(maxPreviewPixels / (outputWidth * outputHeight));
        previewContext.drawImage(offscreenCanvas, 0, 0, outputWidth, outputHeight);
      `),
    ).toBe(true);

    expect(
      sourceUsesLowResolutionPreviewUpscale(`
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        drawAsciiTextToCanvas({ canvas, text });
      `),
    ).toBe(false);
  });

  it("rejects low-resolution preview upscale for text and vector output renderers", () => {
    if (
      appPerformance.rendererWorkload !== "text-output" &&
      appPerformance.rendererWorkload !== "vector-output"
    ) {
      return;
    }

    expect(
      sourceUsesLowResolutionPreviewUpscale(),
      "Text/vector product previews must preserve native output fidelity. Do not render a low-resolution preview canvas/texture and upscale it to state.canvas.size; optimize layout/drawing instead.",
    ).toBe(false);
  });

  it("requires procedural pixel-loop renderers to use a GPU strategy", () => {
    if (!sourceUsesCpuPixelLoop()) {
      return;
    }

    expect(
      appPerformance.rendererWorkload,
      "Procedural ImageData/getImageData/putImageData renderers must be classified as pixel-output.",
    ).toBe("pixel-output");
    expect(
      appPerformance.rendererStrategy,
      "Procedural ImageData/getImageData/putImageData renderers must be converted to WebGL/WebGPU or removed from the critical render path.",
    ).toMatch(/^(webgl|webgpu)$/);
    expect(
      sourceUsesGpuRenderer(),
      "Procedural pixel renderers must contain an actual WebGL/WebGPU code path, not only declare a GPU strategy.",
    ).toBe(true);
    expect(
      appPerformanceHasRenderPipelinePass("pixel-transform"),
      "Procedural pixel renderers must declare a rendererPipeline pixel-transform pass so caching and invalidation are machine-checkable.",
    ).toBe(true);
  });

  it("requires custom renderers to declare high-frequency viewport invalidation", () => {
    if (!appPerformance.usesCustomRenderer) {
      return;
    }

    expect(
      appPerformanceHasInteractionInvalidation("viewport-zoom"),
      "Custom renderer apps must declare rendererPipeline interactionInvalidation for viewport-zoom so zoom can stay responsive without recomputing expensive passes.",
    ).toBe(true);
  });

  it("requires WebGL/WebGPU renderers to keep their pipeline lifecycle outside React render", () => {
    if (!sourceUsesGpuRenderer()) {
      return;
    }

    expect(
      sourceUsesWebGlLifecycleGuard(),
      "WebGL/WebGPU renderer setup must be guarded by refs, memoized setup, an effect, or a renderer class so control changes update uniforms/buffers instead of rebuilding the pipeline.",
    ).toBe(true);
    expect(
      sourceCreatesWebGlContextInComponentRender(),
      "Do not create a WebGL context directly in the component render path; initialize it once and update uniforms/buffers on runtime value changes.",
    ).toBe(false);
  });

  it("requires animation loops to clean up scheduled frames", () => {
    expect(
      sourceUsesAnimationFrameWithoutCleanup(),
      "Renderers that schedule requestAnimationFrame must cancelAnimationFrame on cleanup to avoid runaway loops during control changes or route unmount.",
    ).toBe(false);
  });

  it("rejects direct app storage writes outside the runtime persistence policy", () => {
    expect(
      sourceUsesDirectStorageApi(),
      "Generated apps must not read or write app state through localStorage/sessionStorage directly. Use runtime persistence policy when product persistence is required.",
    ).toBe(false);
  });

  it("rejects renderer effects that overwrite user-edited timeline duration", () => {
    expect(
      sourceResyncsTimelineDurationFromRuntimeDuration(),
      "Renderers must not watch state.timeline.durationSeconds and dispatch timeline.setDuration back to a computed local duration. Compute a default only during initialization/reset, then map renderer progress to state.timeline.durationSeconds.",
    ).toBe(false);
  });

  it("rejects timeline-driven texture uploads in GPU keyframe renderers", () => {
    if (
      !sourceUsesGpuRenderer() ||
      appSchema.panels.timeline?.enabled !== true ||
      appSchema.panels.timeline.mode !== "keyframes"
    ) {
      return;
    }

    expect(
      sourceMayUploadTextureFromTimelineDrivenEffect(),
      "GPU keyframe renderers must upload source textures only when media/resource keys change. Timeline-driven effects may update uniforms and draw, but must not call texImage2D or renderer.setImage from an effect that depends on settings/currentTime/keyframeGroups.",
    ).toBe(false);
  });
});
