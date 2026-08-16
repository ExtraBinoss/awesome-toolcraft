import * as React from "react";

import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react/app-shell/toolcraft-app";

import { appSchema } from "./app-schema";
import { AsciiLabExportControl } from "./ascii-lab-export-control";

const AsciiLabRenderer = React.lazy(() =>
  import("./ascii-lab-renderer").then((module) => ({
    default: module.AsciiLabRenderer,
  })),
);

function AsciiRendererFallback(): React.JSX.Element {
  return (
    <div
      aria-label="Loading ASCII renderer"
      className="absolute inset-0 grid place-items-center bg-[#020307] font-mono text-xs tracking-widest text-white/55"
      role="status"
    >
      PREPARING ASCII RENDERER…
    </div>
  );
}

const charsetPresets: Record<string, string> = {
  "charset.braille": "⠀⠁⠃⠇⡇⣇⣧⣷⣿",
  "charset.blocks": " ░▒▓█",
  "charset.classic": " .,:;irsXA253hMHGS#9B&@",
  "charset.minimal": " .:-=+*#%@",
};

export const appComposition: ToolcraftAppComposition = {
  canvasContent: (
    <React.Suspense fallback={<AsciiRendererFallback />}>
      <AsciiLabRenderer />
    </React.Suspense>
  ),
  controlRenderers: { asciiLabExport: AsciiLabExportControl },
  onPanelAction: ({ action, dispatch }) => {
    const charset = charsetPresets[action.value];

    if (!charset) {
      return;
    }

    dispatch({
      label: `Apply ${action.label ?? "charset"} charset`,
      target: "ascii.charset",
      type: "controls.setValue",
      value: charset,
    });
  },
  renderDefaultCanvasMedia: false,
  schema: appSchema,
};
