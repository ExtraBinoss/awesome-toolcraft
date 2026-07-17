import type { ToolcraftState } from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

import styles from "./pattern-renderer.module.css";

type PatternKind = "grid" | "waves" | "topography" | "stars" | "tiles" | "geometry";

const numberValue = (state: ToolcraftState, target: string, fallback: number) => typeof state.values[target] === "number" ? state.values[target] as number : fallback;
const random = (seed: number, index: number) => { const value = Math.sin(seed * 91.73 + index * 37.19) * 43758.5453; return value - Math.floor(value); };

function motif(state: ToolcraftState) {
  const kind = String(state.values["pattern.type"] ?? "geometry") as PatternKind;
  const size = numberValue(state, "pattern.tileSize", 96);
  const density = numberValue(state, "pattern.density", 58);
  const stroke = numberValue(state, "pattern.stroke", 1.5);
  const seed = numberValue(state, "pattern.seed", 18);
  const color = String(state.values["appearance.foreground"] ?? "#B8FF58");
  const opacity = numberValue(state, "pattern.opacity", 100) / 100;
  const count = Math.max(2, Math.round(2 + density / 14));
  const common = `fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"`;
  if (kind === "grid") {
    const step = size / count;
    return Array.from({ length: count }, (_, i) => `<path d="M ${(i * step).toFixed(2)} 0V${size}M0 ${(i * step).toFixed(2)}H${size}" ${common}/>`).join("");
  }
  if (kind === "waves") {
    const gap = size / count;
    return Array.from({ length: count }, (_, i) => { const y = i * gap + gap / 2; const amp = gap * (.3 + random(seed, i) * .25); return `<path d="M0 ${y.toFixed(2)}C${size / 4} ${(y - amp).toFixed(2)} ${size * 3 / 4} ${(y + amp).toFixed(2)} ${size} ${y.toFixed(2)}" ${common}/>`; }).join("");
  }
  if (kind === "topography") {
    const cx = size * (.42 + (random(seed, 1) - .5) * .16), cy = size * (.5 + (random(seed, 2) - .5) * .12);
    return Array.from({ length: count + 2 }, (_, i) => {
      const rx = size * (.09 + i * .075), ry = rx * (.58 + random(seed, i + 4) * .28);
      return [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => `<ellipse cx="${(cx + dx * size).toFixed(2)}" cy="${(cy + dy * size).toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" ${common}/>`)).join("");
    }).join("");
  }
  if (kind === "stars") {
    const total = Math.round(3 + density / 8);
    return Array.from({ length: total }, (_, i) => {
      const x = random(seed, i * 3) * size, y = random(seed, i * 3 + 1) * size, radius = 2 + random(seed, i * 3 + 2) * size / 13;
      return [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => { const px = x + dx * size, py = y + dy * size; return i % 3 === 0 ? `<path d="M${px.toFixed(2)} ${(py - radius).toFixed(2)}V${(py + radius).toFixed(2)}M${(px - radius).toFixed(2)} ${py.toFixed(2)}H${(px + radius).toFixed(2)}" ${common}/>` : `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${Math.max(stroke, radius * .16).toFixed(2)}" fill="${color}" opacity="${opacity}"/>`; })).join("");
    }).join("");
  }
  if (kind === "tiles") {
    const half = size / 2;
    return `<path d="M0 0H${size}V${size}H0ZM0 ${half}H${size}M${half} 0V${size}" ${common}/><path d="M0 0L${half} ${half}L${size} 0M0 ${size}L${half} ${half}L${size} ${size}" ${common} opacity="${opacity * .65}"/>`;
  }
  const half = size / 2, quarter = size / 4;
  return `<path d="M0 ${half}L${quarter} 0L${half} ${half}L${quarter * 3} 0L${size} ${half}L${quarter * 3} ${size}L${half} ${half}L${quarter} ${size}Z" ${common}/><circle cx="${half}" cy="${half}" r="${quarter * .48}" ${common}/>`;
}

export function createPatternSvg(state: ToolcraftState) {
  const size = numberValue(state, "pattern.tileSize", 96);
  const background = String(state.values["appearance.background"] ?? "#131313");
  const include = state.values["export.includeBackground"] !== false;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${include ? `<rect width="100%" height="100%" fill="${background}"/>` : ""}${motif(state)}</svg>`;
}

export function PatternRenderer() {
  const { state } = useToolcraft();
  const size = numberValue(state, "pattern.tileSize", 96);
  const svg = createPatternSvg(state);
  const image = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const background = state.values["export.includeBackground"] === false ? "transparent" : String(state.values["appearance.background"] ?? "#131313");
  return <div className={styles.output} data-toolcraft-product-output style={{ backgroundColor: background, backgroundImage: image, backgroundSize: `${size}px ${size}px` }}><div className={styles.tile} style={{ width: size, height: size }}><span>{size} × {size}</span></div></div>;
}

export function exportPatternSvg(state: ToolcraftState) {
  const blob = new Blob([createPatternSvg(state)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = `${String(state.values["pattern.type"] ?? "pattern")}-seamless.svg`; link.click(); URL.revokeObjectURL(url);
}

export async function copyPatternSvg(state: ToolcraftState) { await navigator.clipboard.writeText(createPatternSvg(state)); }
