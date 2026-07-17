import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { copyPatternSvg, exportPatternSvg, PatternRenderer } from "./pattern-renderer";

const kinds = ["geometry", "grid", "waves", "topography", "stars", "tiles"];

export const appComposition: ToolcraftAppComposition = {
  schema: appSchema,
  canvasContent: <PatternRenderer />,
  renderDefaultCanvasMedia: false,
  onPanelAction: ({ action, dispatch, state }) => {
    if (action.value === "export.svg") return exportPatternSvg(state);
    if (action.value === "export.copy") return copyPatternSvg(state);
    if (action.value === "pattern.newSeed") dispatch({ type: "controls.setValue", target: "pattern.seed", value: 1 + Math.floor(Math.random() * 999), label: "New pattern seed" });
    if (action.value === "pattern.randomize") {
      dispatch({ type: "controls.setValue", target: "pattern.type", value: kinds[Math.floor(Math.random() * kinds.length)], label: "Randomize pattern" });
      dispatch({ type: "controls.setValue", target: "pattern.tileSize", value: 48 + Math.floor(Math.random() * 145), label: "Randomize tile size" });
      dispatch({ type: "controls.setValue", target: "pattern.density", value: 20 + Math.floor(Math.random() * 76), label: "Randomize density" });
      dispatch({ type: "controls.setValue", target: "pattern.seed", value: 1 + Math.floor(Math.random() * 999), label: "Randomize seed" });
    }
  },
};
