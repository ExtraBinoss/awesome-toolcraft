import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { AuroraRenderer, exportAurora } from "./aurora-renderer";

function hsl(h: number, s: number, l: number): string {
  const saturation = s / 100, lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1)); const m = lightness - c / 2;
  const [r,g,b] = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x] : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
  return `#${[r,g,b].map((v) => Math.round((v+m)*255).toString(16).padStart(2,"0")).join("")}`;
}

export const appComposition: ToolcraftAppComposition = {
  schema: appSchema, canvasContent: <AuroraRenderer />, renderDefaultCanvasMedia: false,
  onPanelAction: ({ action, dispatch, state }) => {
    if (action.value === "export.png") return exportAurora(state);
    if (action.value === "aurora.randomize") {
      dispatch({ type: "controls.setValue", target: "aurora.seed", value: 1 + Math.floor(Math.random()*100), label: "Randomize seed" });
      dispatch({ type: "controls.setValue", target: "aurora.turbulence", value: 30 + Math.floor(Math.random()*66), label: "Randomize turbulence" });
      dispatch({ type: "controls.setValue", target: "aurora.scale", value: 25 + Math.floor(Math.random()*61), label: "Randomize scale" });
      dispatch({ type: "controls.setValue", target: "aurora.width", value: 25 + Math.floor(Math.random()*56), label: "Randomize width" });
      dispatch({ type: "controls.setValue", target: "aurora.depth", value: 35 + Math.floor(Math.random()*66), label: "Randomize depth" });
    }
    if (action.value === "aurora.randomizeColors") {
      const current = state.values["aurora.palette"] as { stops?: Array<Record<string, unknown>> } | undefined;
      if (!current?.stops) return;
      const base = Math.floor(Math.random()*360); const span = 70 + Math.random()*150;
      const stops = current.stops.map((stop, index) => ({ ...stop, color: hsl((base + span * index / Math.max(1,current.stops!.length-1))%360, 82+Math.random()*16, 54+Math.random()*12) }));
      dispatch({ type: "controls.setValue", target: "aurora.palette", value: { ...current, stops }, label: "Randomize colors" });
    }
  },
};
