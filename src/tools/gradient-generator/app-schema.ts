import { defineToolcraft } from "@/toolcraft/runtime/schema/define-toolcraft";
import { logToolLoad } from "@/tool-load-debug";

logToolLoad("module:evaluated gradient schema:start");

const responsiveness = (reason: string) => ({ performanceRole: "responsiveness" as const, performanceReason: reason });

export const appSchema = defineToolcraft({
  canvas: { enabled: true, renderScale: false, size: { width: 1080, height: 1350, unit: "px" }, sizing: { mode: "editable-output" }, upload: false },
  export: { png: { background: "transparent" } },
  panels: {
    controls: {
      title: "Controls",
      sections: [
        {
          title: "Gradient",
          controls: {
            gradient: {
              type: "gradient", target: "gradient.fill", label: "Color field",
              defaultValue: { angle: 135, gradientType: "linear", stops: [
                { color: "#6C3BFF", position: "0%" },
                { color: "#FF4F9A", position: "34%" },
                { color: "#FF9B54", position: "67%" },
                { color: "#3B82F6", position: "100%" },
              ] },
              ...responsiveness("Color, stop, type, and angle edits update the procedural field live."),
            },
            spread: { type: "slider", target: "gradient.spread", label: "Spread", defaultValue: 68, min: 20, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Spread changes field falloff without increasing cost.") },
            seed: { type: "slider", target: "gradient.seed", label: "Seed", defaultValue: 37, min: 1, max: 100, step: 1, sliderValueKind: "continuous", ...responsiveness("Seed deterministically repositions color blooms.") },
            randomize: { type: "actions", target: "actions.gradient", label: "Variations", actions: [
              { label: "Randomize", value: "gradient.randomize" },
              { label: "Shuffle colors", value: "gradient.shuffle" },
              { label: "Randomize colors", value: "gradient.randomizeColors" },
            ] },
          },
        },
        {
          title: "Organic Flow",
          controls: {
            warp: { type: "slider", target: "gradient.warp", label: "Distortion", defaultValue: 42, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Distortion bends every gradient geometry with a fluid noise field.") },
            scale: { type: "slider", target: "gradient.scale", label: "Flow scale", defaultValue: 46, min: 5, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Flow scale controls the size of organic structures.") },
            density: { type: "slider", target: "gradient.density", label: "Density", defaultValue: 52, min: 5, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Density controls the size and frequency of the simplex noise regions.") },
            detail: { type: "slider", target: "gradient.detail", label: "Detail", defaultValue: 38, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Detail adds nested procedural movement without changing the palette.") },
            softness: { type: "slider", target: "gradient.softness", label: "Softness", defaultValue: 72, min: 5, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Softness blends color bands into broad, fluid transitions.") },
            negativeSpace: { type: "slider", target: "gradient.negativeSpace", label: "Negative space", defaultValue: 80, min: 0, max: 80, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Negative space carves dark or transparent pockets into the field.") },
          },
        },
        {
          title: "Motion",
          controls: {
            animate: { type: "switch", target: "motion.animate", label: "Animate", defaultValue: true, ...responsiveness("Animation moves the simplex field through its third noise dimension.") },
            speed: { type: "slider", target: "motion.speed", label: "Speed", defaultValue: 32, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Speed controls how quickly the organic regions flow.") },
          },
        },
        {
          title: "Texture",
          controls: {
            grain: { type: "slider", target: "texture.grain", label: "Grain", defaultValue: 3, min: 0, max: 60, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Grain adds an optional fine finish over the smooth field.") },
            grainSize: { type: "slider", target: "texture.grainSize", label: "Grain size", defaultValue: 2, min: 1, max: 8, step: 1, unit: "px", sliderValueKind: "continuous", ...responsiveness("Grain size changes the texture scale.") },
            vignette: { type: "slider", target: "texture.vignette", label: "Vignette", defaultValue: 14, min: 0, max: 70, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Vignette changes one composited overlay.") },
          },
        },
        {
          title: "Tone",
          controls: {
            contrast: { type: "slider", target: "tone.contrast", label: "Contrast", defaultValue: 108, min: 70, max: 150, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Contrast uses a lightweight visual filter.") },
            brightness: { type: "slider", target: "tone.brightness", label: "Brightness", defaultValue: 102, min: 70, max: 140, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Brightness uses a lightweight visual filter.") },
            saturation: { type: "slider", target: "tone.saturation", label: "Saturation", defaultValue: 118, min: 0, max: 180, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Saturation uses a lightweight visual filter.") },
          },
        },
        {
          title: "Background",
          controls: {
            includeBackground: { type: "switch", target: "export.includeBackground", label: "Include", defaultValue: true, description: "Controls preview and PNG transparency.", ...responsiveness("The toggle changes preview alpha.") },
            background: { type: "color", target: "appearance.background", label: false, defaultValue: "#050505", ...responsiveness("The background updates one layer.") },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["includeBackground", "background"] }],
        },
        {
          title: "Image Export",
          controls: {
            imageFormat: { type: "select", target: "export.image.format", label: "Format", defaultValue: "png", options: [{ label: "PNG", value: "png" }, { label: "JPG", value: "jpg" }], ...responsiveness("Format changes the downloaded image encoding.") },
            imageResolution: { type: "select", target: "export.image.resolution", label: "Resolution", defaultValue: "4k", options: [{ label: "2K", value: "2k" }, { label: "4K", value: "4k" }, { label: "8K", value: "8k" }], performanceRole: "workload", performanceReason: "Resolution controls exported pixel count." },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["imageFormat", "imageResolution"] }],
        },
        {
          title: "Export",
          actionGroup: "secondary",
          controls: {
            outputActions: { type: "panelActions", target: "actions.output", actions: [{ icon: "upload-simple", label: "Export PNG", role: "export-image", value: "export.png" }] },
          },
        },
      ],
    },
  },
  persistence: { storage: "localStorage", key: "toolcraft:gradient-generator:state:v2", version: 2, include: ["values", "canvas", "panels"] },
  settingsTransfer: { enabled: true, appId: "gradient-generator", fileName: "gradient-generator-settings" },
  toolbar: { back: { href: "/", label: "Back to tools" }, history: true, radar: true, theme: true, zoom: true },
});

logToolLoad("module:evaluated gradient schema:end");
