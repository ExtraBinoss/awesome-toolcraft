import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react/app-shell/toolcraft-app";

import { DitherHeatmapRenderer } from "./dither-heatmap-renderer";
import { appSchema } from "./app-schema";

const palettes: Record<string, string[]> = {
  "palette.inferno": ["#15002D", "#3C2E9D", "#E63151", "#FF9F43", "#FFE98A"],
  "palette.ocean": ["#03134F", "#075B9D", "#00A9D6", "#67E5D2", "#D5FFD5"],
  "palette.acid": ["#13002A", "#5420A4", "#8D2CFF", "#D9FF49", "#F5FFE3"],
  "palette.mono": ["#08090B", "#35363B", "#73757C", "#B9BBC0", "#F4F4EF"],
};

export const appComposition: ToolcraftAppComposition = {
  schema: appSchema,
  canvasContent: <DitherHeatmapRenderer />,
  renderDefaultCanvasMedia: false,
  onPanelAction: ({ action, dispatch, state }) => {
    const colors = palettes[action.value];
    if (!colors) return;
    const current = state.values["heatmap.palette"];
    const base = current && typeof current === "object" ? current as Record<string, unknown> : {};
    dispatch({
      type: "controls.setValue",
      target: "heatmap.palette",
      value: { ...base, angle: 90, gradientType: "linear", stops: colors.map((color, index) => ({ color, position: `${Math.round(index / (colors.length - 1) * 100)}%` })) },
      label: `Apply ${action.label ?? "palette"}`,
    });
  },
};
