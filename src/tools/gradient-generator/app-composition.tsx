import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react/app-shell/toolcraft-app";

import { appSchema } from "./app-schema";
import { GradientRenderer } from "./gradient-renderer";
import { logToolLoad } from "@/tool-load-debug";

logToolLoad("module:evaluated gradient composition:start");

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
    if (action.value === "textFill.randomSolid") {
      dispatch([
        { type: "controls.setValue", target: "text.fill.mode", value: "solid", label: "Use solid text fill" },
        { type: "controls.setValue", target: "text.fill.color", value: hslToHex(Math.floor(Math.random() * 360), 82 + Math.random() * 14, 54 + Math.random() * 18), label: "Randomize text color" },
      ]);
    }
    if (action.value === "textFill.randomGradient") {
      const current = state.values["text.fill.gradient"] as { stops?: Array<Record<string, unknown>> } | undefined;
      const baseStops = current?.stops ?? [
        { color: "#FFFFFF", position: "0%" },
        { color: "#7DD3FC", position: "50%" },
        { color: "#C084FC", position: "100%" },
      ];
      const baseHue = Math.floor(Math.random() * 360);
      const direction = Math.random() > 0.5 ? 1 : -1;
      dispatch([
        { type: "controls.setValue", target: "text.fill.mode", value: "gradient", label: "Use gradient text fill" },
        {
          type: "controls.setValue", target: "text.fill.gradient", label: "Randomize text gradient",
          value: {
            angle: Math.floor(Math.random() * 360),
            gradientType: ["linear", "radial", "angular", "diamond"][Math.floor(Math.random() * 4)],
            stops: baseStops.map((stop, index) => ({
              ...stop,
              color: hslToHex((baseHue + direction * index * (55 + Math.random() * 45) + 360) % 360, 80 + Math.random() * 16, 50 + Math.random() * 18),
            })),
          },
        },
      ]);
    }
    if (action.value === "gradient.randomize") {
      const current = state.values["gradient.fill"] as { angle?: number; stops?: unknown[] } | undefined;
      dispatch([
        { type: "controls.setValue", target: "gradient.seed", value: Math.floor(Math.random() * 100) + 1, label: "Randomize gradient" },
        { type: "controls.setValue", target: "gradient.warp", value: 28 + Math.floor(Math.random() * 67), label: "Randomize distortion" },
        { type: "controls.setValue", target: "gradient.scale", value: 18 + Math.floor(Math.random() * 68), label: "Randomize flow scale" },
        { type: "controls.setValue", target: "gradient.density", value: 18 + Math.floor(Math.random() * 76), label: "Randomize density" },
        { type: "controls.setValue", target: "gradient.detail", value: 15 + Math.floor(Math.random() * 76), label: "Randomize detail" },
        { type: "controls.setValue", target: "gradient.softness", value: 45 + Math.floor(Math.random() * 51), label: "Randomize softness" },
        { type: "controls.setValue", target: "gradient.negativeSpace", value: 52 + Math.floor(Math.random() * 29), label: "Randomize negative space" },
        ...(current ? [{ type: "controls.setValue" as const, target: "gradient.fill", value: { ...current, angle: Math.floor(Math.random() * 360) }, label: "Randomize gradient direction" }] : []),
      ]);
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

logToolLoad("module:evaluated gradient composition:end");
