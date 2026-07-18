import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { exportGradient, GradientRenderer } from "./gradient-renderer";

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - chroma / 2;
  const [r, g, b] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return `#${[r, g, b].map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export const appComposition: ToolcraftAppComposition = {
  schema: appSchema,
  canvasContent: <GradientRenderer />,
  renderDefaultCanvasMedia: false,
  onPanelAction: ({ action, dispatch, state }) => {
    if (action.value === "export.png") return exportGradient(state);
    if (action.value === "gradient.randomize") {
      dispatch({ type: "controls.setValue", target: "gradient.seed", value: Math.floor(Math.random() * 100) + 1, label: "Randomize gradient" });
      dispatch({ type: "controls.setValue", target: "gradient.warp", value: 28 + Math.floor(Math.random() * 67), label: "Randomize distortion" });
      dispatch({ type: "controls.setValue", target: "gradient.scale", value: 18 + Math.floor(Math.random() * 68), label: "Randomize flow scale" });
      dispatch({ type: "controls.setValue", target: "gradient.density", value: 18 + Math.floor(Math.random() * 76), label: "Randomize density" });
      dispatch({ type: "controls.setValue", target: "gradient.detail", value: 15 + Math.floor(Math.random() * 76), label: "Randomize detail" });
      dispatch({ type: "controls.setValue", target: "gradient.softness", value: 45 + Math.floor(Math.random() * 51), label: "Randomize softness" });
      dispatch({ type: "controls.setValue", target: "gradient.negativeSpace", value: 52 + Math.floor(Math.random() * 29), label: "Randomize negative space" });

      const current = state.values["gradient.fill"] as { angle?: number; stops?: unknown[] } | undefined;
      if (current) dispatch({
        type: "controls.setValue",
        target: "gradient.fill",
        value: { ...current, angle: Math.floor(Math.random() * 360) },
        label: "Randomize gradient direction",
      });
    }
    if (action.value === "gradient.shuffle") {
      const current = state.values["gradient.fill"] as { stops?: Array<Record<string, unknown>> } | undefined;
      if (current?.stops) {
        const colors = current.stops.map((stop) => stop.color);
        for (let index = colors.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [colors[index], colors[swapIndex]] = [colors[swapIndex], colors[index]];
        }
        if (colors.every((color, index) => color === current.stops?.[index]?.color) && colors.length > 1) colors.push(colors.shift());
        dispatch({
          type: "controls.setValue",
          target: "gradient.fill",
          value: { ...current, stops: current.stops.map((stop, index) => ({ ...stop, color: colors[index] })) },
          label: "Shuffle colors",
        });
      }
    }
    if (action.value === "gradient.randomizeColors") {
      const current = state.values["gradient.fill"] as { stops?: Array<Record<string, unknown>> } | undefined;
      if (current?.stops) {
        const baseHue = Math.floor(Math.random() * 360);
        const direction = Math.random() > 0.5 ? 1 : -1;
        const hueSpan = 105 + Math.random() * 135;
        const nextStops = current.stops.map((stop, index) => {
          const progress = current.stops && current.stops.length > 1 ? index / (current.stops.length - 1) : 0;
          const hue = (baseHue + direction * hueSpan * progress + 360) % 360;
          const saturation = 78 + Math.random() * 18;
          const lightness = 47 + Math.sin(progress * Math.PI) * 12 + Math.random() * 6;
          return { ...stop, color: hslToHex(hue, saturation, lightness) };
        });
        dispatch({ type: "controls.setValue", target: "gradient.fill", value: { ...current, stops: nextStops }, label: "Randomize colors" });
      }
    }
  },
};
