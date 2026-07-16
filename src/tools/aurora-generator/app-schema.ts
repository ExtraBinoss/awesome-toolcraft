import { defineToolcraft } from "@/toolcraft/runtime";

const responsive = (performanceReason: string) => ({ performanceRole: "responsiveness" as const, performanceReason });

export const appSchema = defineToolcraft({
  canvas: { enabled: true, renderScale: false, size: { width: 1920, height: 1080, unit: "px" }, sizing: { mode: "editable-output" }, upload: false },
  export: { png: { background: "transparent" } },
  panels: { controls: { title: "Controls", sections: [
    { title: "Aurora", controls: {
      palette: { type: "gradient", target: "aurora.palette", label: "Light spectrum", defaultValue: { angle: 90, gradientType: "linear", stops: [
        { color: "#57F5FF", position: "0%" }, { color: "#5D63FF", position: "34%" }, { color: "#B839FF", position: "68%" }, { color: "#FF4FA3", position: "100%" },
      ] }, ...responsive("Palette edits recolor every light ribbon live.") },
      seed: { type: "slider", target: "aurora.seed", label: "Seed", defaultValue: 23, min: 1, max: 100, step: 1, sliderValueKind: "continuous", ...responsive("Seed changes the deterministic wave composition.") },
      actions: { type: "actions", target: "actions.aurora", label: "Variations", actions: [
        { label: "Randomize", value: "aurora.randomize" }, { label: "Randomize colors", value: "aurora.randomizeColors" },
      ] },
    } },
    { title: "Light Flow", controls: {
      ribbons: { type: "slider", target: "aurora.ribbons", label: "Ribbons", defaultValue: 5, min: 2, max: 8, step: 1, variant: "discrete", sliderValueKind: "discrete", ...responsive("Ribbon count changes the layered light structure.") },
      turbulence: { type: "slider", target: "aurora.turbulence", label: "Turbulence", defaultValue: 52, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Turbulence bends the wave paths.") },
      organic: { type: "slider", target: "aurora.organic", label: "Organic flow", defaultValue: 68, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Organic flow warps ribbons through a second coherent noise field.") },
      complexity: { type: "slider", target: "aurora.complexity", label: "Complexity", defaultValue: 38, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Complexity adds smaller natural folds to the broad waves.") },
      flowScale: { type: "slider", target: "aurora.scale", label: "Flow scale", defaultValue: 48, min: 10, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Flow scale changes the size of the waves.") },
      width: { type: "slider", target: "aurora.width", label: "Ribbon width", defaultValue: 42, min: 8, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Width controls the light body around each path.") },
      softness: { type: "slider", target: "aurora.softness", label: "Softness", defaultValue: 76, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Softness feathers the body and halo without introducing hard bands.") },
      depth: { type: "slider", target: "aurora.depth", label: "Depth", defaultValue: 64, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Depth separates foreground and background ribbons.") },
      glow: { type: "slider", target: "aurora.glow", label: "Glow", defaultValue: 78, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Glow controls the atmospheric halo.") },
      negativeSpace: { type: "slider", target: "aurora.negativeSpace", label: "Negative space", defaultValue: 58, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Negative space deepens the black gaps between light ribbons.") },
    } },
    { title: "Motion", controls: {
      animate: { type: "switch", target: "motion.animate", label: "Animate", defaultValue: true, ...responsive("Animation moves the procedural noise field.") },
      speed: { type: "slider", target: "motion.speed", label: "Speed", defaultValue: 32, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Speed changes live wave movement.") },
    } },
    { title: "Finish", controls: {
      exposure: { type: "slider", target: "tone.exposure", label: "Exposure", defaultValue: 108, min: 60, max: 160, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Exposure grades the final composite.") },
      saturation: { type: "slider", target: "tone.saturation", label: "Saturation", defaultValue: 112, min: 0, max: 180, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Saturation grades the final composite.") },
      grain: { type: "slider", target: "tone.grain", label: "Grain", defaultValue: 2, min: 0, max: 30, step: 1, unit: "%", sliderValueKind: "continuous", ...responsive("Grain adds a subtle surface finish.") },
    } },
    { title: "Background", controls: {
      include: { type: "switch", target: "export.includeBackground", label: "Include", defaultValue: true, ...responsive("Include controls preview and PNG transparency.") },
      color: { type: "color", target: "appearance.background", label: false, defaultValue: "#03040A", ...responsive("Background color changes the dark canvas behind the light.") },
    }, layoutGroups: [{ layout: "inline", columns: 2, controls: ["include", "color"] }] },
    { title: "Image Export", controls: {
      format: { type: "select", target: "export.image.format", label: "Format", defaultValue: "png", options: [{ label: "PNG", value: "png" }, { label: "JPG", value: "jpg" }], ...responsive("Format selects the downloaded image encoding.") },
      resolution: { type: "select", target: "export.image.resolution", label: "Resolution", defaultValue: "4k", options: [{ label: "2K", value: "2k" }, { label: "4K", value: "4k" }, { label: "8K", value: "8k" }], performanceRole: "workload", performanceReason: "Resolution controls exported pixel count." },
    }, layoutGroups: [{ layout: "inline", columns: 2, controls: ["format", "resolution"] }] },
    { title: "Export", actionGroup: "secondary", controls: { output: { type: "panelActions", target: "actions.output", actions: [{ icon: "upload-simple", label: "Export PNG", role: "export-image", value: "export.png" }] } } },
  ] } },
  persistence: { storage: "localStorage", key: "toolcraft:aurora-generator:state:v1", version: 1, include: ["values", "canvas", "panels"] },
  settingsTransfer: { enabled: true, appId: "aurora-generator", fileName: "aurora-generator-settings" },
  toolbar: { back: { href: "/", label: "Back to tools" }, history: true, radar: true, theme: true, zoom: true },
});
