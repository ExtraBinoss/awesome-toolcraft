import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react/app-shell/toolcraft-app";

import { appSchema } from "./app-schema";
import { SuminagashiRenderer } from "./suminagashi-renderer";

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - chroma / 2;
  const channels = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return `#${channels.map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export const appComposition: ToolcraftAppComposition = {
  schema: appSchema,
  canvasContent: <SuminagashiRenderer />,
  renderDefaultCanvasMedia: false,
  onPanelAction: ({ action, dispatch, state }) => {
    if (action.value === "suminagashi.randomize") {
      dispatch([
        { type: "controls.setValue", target: "suminagashi.seed", value: Math.floor(Math.random() * 1000) + 1, label: "Randomize seed" },
        { type: "controls.setValue", target: "suminagashi.drops", value: 4 + Math.floor(Math.random() * 15), label: "Randomize drops" },
        { type: "controls.setValue", target: "suminagashi.ringCount", value: 12 + Math.floor(Math.random() * 54), label: "Randomize rings" },
        { type: "controls.setValue", target: "suminagashi.turbulence", value: Math.floor(Math.random() * 65), label: "Randomize turbulence" },
        { type: "controls.setValue", target: "suminagashi.swirl", value: 10 + Math.floor(Math.random() * 80), label: "Randomize swirl" },
        { type: "controls.setValue", target: "suminagashi.flowAngle", value: Math.floor(Math.random() * 360), label: "Randomize flow angle" },
      ]);
    }
    if (action.value === "suminagashi.randomizeColors") {
      const current = state.values["suminagashi.palette"];
      if (current && typeof current === "object" && "stops" in current && Array.isArray(current.stops)) {
        const palette = current as { stops: Array<Record<string, unknown>>; [key: string]: unknown };
        const baseHue = Math.floor(Math.random() * 360);
        const direction = Math.random() > 0.5 ? 1 : -1;
        const hueSpan = 80 + Math.random() * 170;
        const stops = palette.stops.map((stop, index) => {
          const progress = palette.stops.length > 1 ? index / (palette.stops.length - 1) : 0;
          const hue = (baseHue + direction * hueSpan * progress + 360) % 360;
          const saturation = 55 + Math.random() * 35;
          const lightness = 34 + Math.sin(progress * Math.PI) * 22 + Math.random() * 8;
          return { ...stop, color: hslToHex(hue, saturation, lightness) };
        });
        dispatch({ type: "controls.setValue", target: "suminagashi.palette", value: { ...palette, stops }, label: "Randomize colors" });
      }
    }
    if (action.value === "suminagashi.shufflePalette") {
      const current = state.values["suminagashi.palette"];
      if (current && typeof current === "object" && "stops" in current && Array.isArray(current.stops)) {
        const stops = [...current.stops];
        for (let index = stops.length - 1; index > 0; index -= 1) {
          const swap = Math.floor(Math.random() * (index + 1));
          [stops[index], stops[swap]] = [stops[swap], stops[index]];
        }
        dispatch({ type: "controls.setValue", target: "suminagashi.palette", value: { ...current, stops }, label: "Shuffle palette" });
      }
    }
  },
};
