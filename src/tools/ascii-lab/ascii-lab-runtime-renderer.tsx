"use client";

import * as React from "react";

import {
  useToolcraftSelector,
  useToolcraftStore,
} from "@/toolcraft/runtime/react/app-shell/use-toolcraft";
import type { ToolcraftMediaAsset } from "@/toolcraft/runtime/state/types";

import { AsciiImageCanvas } from "./ascii-lab-image-canvas";

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

function stringValue(values: Record<string, unknown>, target: string, fallback: string): string {
  const value = values[target];
  return typeof value === "string" ? value : fallback;
}

function numberValue(values: Record<string, unknown>, target: string, fallback: number): number {
  const value = values[target];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function AsciiLabRuntimeRenderer(): React.JSX.Element {
  const store = useToolcraftStore();
  const mediaAssets = useToolcraftSelector(
    React.useCallback((state) => state.mediaAssets, []),
  );
  const isPlaying = useToolcraftSelector(
    React.useCallback((state) => state.timeline.isPlaying, []),
  );
  const valuesRevision = useToolcraftSelector(
    React.useCallback((state) => state.values, []),
  );
  const keyframeGroups = useToolcraftSelector(
    React.useCallback((state) => state.timeline.keyframeGroups, []),
  );
  const values = React.useMemo(
    () => store.getEvaluatedValues(),
    [keyframeGroups, store, valuesRevision],
  );
  const source = sourceAsset(mediaAssets);

  if (isModelAsset(source)) {
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

  const paperAmbient = values["paper.ambient"] === true;
  const foreground = stringValue(values, "ascii.foreground", "#D8FF65");
  const background = stringValue(values, "scene.background", "#020307");
  const paperSpeed = isPlaying ? numberValue(values, "ascii.motion", 18) / 100 : 0;

  return (
    <div className="absolute inset-0 overflow-hidden" data-toolcraft-ascii-lab-output="true" data-toolcraft-product-output>
      {paperAmbient ? (
        <React.Suspense fallback={null}>
          <AsciiLabPaperAmbient
            background={background}
            foreground={foreground}
            speed={paperSpeed}
          />
        </React.Suspense>
      ) : null}
      {source ? (
        <AsciiImageCanvas
          asset={source}
          keyframeGroupsRevision={keyframeGroups}
          store={store}
          valuesRevision={valuesRevision}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[#020307] text-xs text-white/60">
          Drop an image or 3D model to start.
        </div>
      )}
      <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] tracking-wide text-white/70">
        ASCII IMAGE FIELD
      </div>
    </div>
  );
}
