"use client";

import * as React from "react";

import {
  useToolcraftSelector,
  useToolcraftStore,
  useToolcraftValue,
} from "@/toolcraft/runtime/react/app-shell/use-toolcraft";
import type { ToolcraftMediaAsset } from "@/toolcraft/runtime/state/types";

import { AsciiImageCanvas, AsciiTextCanvas } from "./ascii-lab-image-canvas";

const AsciiLabThreeRenderer = React.lazy(() =>
  import("./ascii-lab-renderer").then((module) => ({
    default: module.AsciiLabRenderer,
  })),
);
const AsciiLabPaperAmbient = React.lazy(() =>
  import("./ascii-lab-paper-ambient").then((module) => ({
    default: module.AsciiLabPaperAmbient,
  })),
);

function sourceAsset(mediaAssets: readonly ToolcraftMediaAsset[]): ToolcraftMediaAsset | undefined {
  return (
    mediaAssets.find((asset) => asset.sourceTarget === "ascii.source") ??
    mediaAssets.find(
      (asset) => asset.assetKind === "image" || asset.mimeType.startsWith("image/"),
    )
  );
}

function isModelAsset(asset: ToolcraftMediaAsset | undefined): boolean {
  return Boolean(asset && /\.(glb|gltf|obj|stl)$/i.test(asset.fileName));
}

function colorHexValue(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "hex" in value) {
    const hex = (value as { hex?: unknown }).hex;
    if (typeof hex === "string") return hex;
  }
  return fallback;
}

function PaperAmbientLayer(): React.JSX.Element {
  const isPlaying = useToolcraftSelector(
    React.useCallback((state) => state.timeline.isPlaying, []),
  );
  const foregroundValue = useToolcraftValue("ascii.foreground");
  const backgroundValue = useToolcraftValue("scene.background");
  const motionValue = useToolcraftValue("ascii.motion");
  const foreground = colorHexValue(foregroundValue, "#D8FF65");
  const background = colorHexValue(backgroundValue, "#020307");
  const speed = isPlaying && typeof motionValue === "number" ? motionValue / 100 : 0;

  return (
    <React.Suspense fallback={null}>
      <AsciiLabPaperAmbient
        background={background}
        foreground={foreground}
        speed={speed}
      />
    </React.Suspense>
  );
}

export function AsciiLabRuntimeRenderer(): React.JSX.Element {
  const store = useToolcraftStore();
  const mediaAssets = useToolcraftSelector(
    React.useCallback((state) => state.mediaAssets, []),
  );
  const source = sourceAsset(mediaAssets);
  const sourceModeValue = useToolcraftValue("ascii.sourceMode");
  const paperAmbientValue = useToolcraftValue("paper.ambient");
  const sourceMode = typeof sourceModeValue === "string" ? sourceModeValue : "image";

  if (sourceMode === "image" && isModelAsset(source)) {
    return (
      <React.Suspense
        fallback={
          <div className="absolute inset-0 grid place-items-center bg-[#020307] font-mono text-xs tracking-widest text-white/55">
            LOADING 3D ENGINE…
          </div>
        }
      >
        <AsciiLabThreeRenderer />
      </React.Suspense>
    );
  }

  const paperAmbient = paperAmbientValue === true;

  return (
    <div className="absolute inset-0 overflow-hidden" data-toolcraft-ascii-lab-output="true" data-toolcraft-product-output>
      {paperAmbient ? (
        <PaperAmbientLayer />
      ) : null}
      {sourceMode === "text" ? (
        <AsciiTextCanvas
          store={store}
        />
      ) : source ? (
        <AsciiImageCanvas
          asset={source}
          store={store}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[#020307] text-xs text-white/60">
          Drop an image or 3D model to start.
        </div>
      )}
    </div>
  );
}
