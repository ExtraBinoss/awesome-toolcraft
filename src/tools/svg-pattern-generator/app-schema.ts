import { defineToolcraft } from "@/toolcraft/runtime";

const responsive = (performanceReason: string) => ({ performanceRole: "responsiveness" as const, performanceReason });

export const appSchema = defineToolcraft({
  canvas: { enabled: true, renderScale: false, size: { width: 1080, height: 1080, unit: "px" }, sizing: { mode: "editable-output" }, upload: false },
  export: { png: { background: "transparent" } },
  panels: { controls: { title: "Pattern controls", sections: [
    { title: "Pattern", controls: {
      type: { type: "select", target: "pattern.type", label: "Style", defaultValue: "geometry", options: [
        { label: "Geometric", value: "geometry" }, { label: "Grid", value: "grid" }, { label: "Waves", value: "waves" },
        { label: "Topography", value: "topography" }, { label: "Stars", value: "stars" }, { label: "Tiles", value: "tiles" },
      ], ...responsive("Style swaps the vector motif without changing the output pipeline.") },
      variations: { type: "actions", target: "actions.pattern", label: "Variations", actions: [
        { label: "Randomize", value: "pattern.randomize" }, { label: "New seed", value: "pattern.newSeed" },
      ] },
    } },
    { title: "Geometry", controls: {
      tileSize: { type: "slider", target: "pattern.tileSize", label: "Tile size", defaultValue: 96, min: 32, max: 240, step: 1, unit: "px", sliderValueKind: "continuous", ...responsive("Tile size changes the repeat interval.") },
      density: { type: "slider", target: "pattern.density", label: "Density", defaultValue: 58, min: 10, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Density changes the number of elements per tile.") },
      stroke: { type: "slider", target: "pattern.stroke", label: "Stroke", defaultValue: 1.5, min: 0.5, max: 6, step: 0.5, unit: "px", sliderValueKind: "continuous", ...responsive("Stroke width updates vector paths live.") },
      opacity: { type: "slider", target: "pattern.opacity", label: "Opacity", defaultValue: 100, min: 5, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Opacity adjusts the motif finish.") },
      seed: { type: "slider", target: "pattern.seed", label: "Seed", defaultValue: 18, min: 1, max: 999, step: 1, variant: "discrete", sliderValueKind: "discrete", ...responsive("Seed deterministically regenerates organic and scattered motifs.") },
    } },
    { title: "Colors", controls: {
      foreground: { type: "color", target: "appearance.foreground", label: "Pattern", defaultValue: "#B8FF58", ...responsive("Pattern color updates every vector element.") },
      background: { type: "color", target: "appearance.background", label: "Background", defaultValue: "#131313", ...responsive("Background color updates the tile and preview.") },
    }, layoutGroups: [{ layout: "inline", columns: 2, controls: ["foreground", "background"] }] },
    { title: "Background", controls: {
      includeBackground: { type: "switch", target: "export.includeBackground", label: "Include in SVG", defaultValue: true, description: "Disable for a transparent seamless tile.", ...responsive("The switch includes or removes the SVG background rectangle.") },
    } },
    { title: "Export", actionGroup: "secondary", controls: {
      output: { type: "panelActions", target: "actions.output", actions: [
        { icon: "copy", label: "Copy SVG", role: "default", value: "export.copy" },
        { icon: "upload-simple", label: "Export SVG", role: "export-image", value: "export.svg" },
      ] },
    } },
  ] } },
  persistence: { storage: "localStorage", key: "toolcraft:svg-pattern-generator:state:v1", version: 1, include: ["values", "canvas", "panels"] },
  settingsTransfer: { enabled: true, appId: "svg-pattern-generator", fileName: "svg-pattern-generator-settings" },
  toolbar: { back: { href: "/", label: "Back to tools" }, history: true, radar: true, theme: true, zoom: true },
});
