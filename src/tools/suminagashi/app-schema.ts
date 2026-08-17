import { defineToolcraft } from "@/toolcraft/runtime/schema/define-toolcraft";
import { withBasePath } from "@/base-path";

const responsive = (performanceReason: string) => ({
  performanceRole: "responsiveness" as const,
  performanceReason,
});

const slider = (
  target: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step = 1,
  unit?: string,
) => ({
  type: "slider",
  target,
  label,
  defaultValue,
  min,
  max,
  step,
  unit,
  sliderValueKind: step < 1 ? "continuous" : "discrete",
} as const);

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    renderScale: false,
    size: { width: 1080, height: 1350, unit: "px" },
    sizing: { mode: "editable-output" },
    upload: false,
  },
  export: { png: { background: "transparent" } },
  panels: {
    controls: {
      title: "Suminagashi",
      sections: [
        {
          title: "Pattern",
          controls: {
            pattern: {
              type: "select",
              target: "suminagashi.pattern",
              label: "Style",
              defaultValue: "suminagashi",
              options: [
                { label: "Suminagashi", value: "suminagashi" },
                { label: "Stone", value: "stone" },
                { label: "Bouquet", value: "bouquet" },
                { label: "Combed", value: "combed" },
              ],
            },
            drops: { ...slider("suminagashi.drops", "Ink drops", 8, 2, 24), ...responsive("The shader loops over a bounded number of ink drops.") },
            ringCount: { ...slider("suminagashi.ringCount", "Rings", 28, 6, 80), ...responsive("Ring frequency is evaluated directly in the fragment shader.") },
            ringThickness: { ...slider("suminagashi.ringThickness", "Ring sharpness", 58, 5, 100, 1, "%"), ...responsive("Sharpness changes the edge profile without adding simulation steps.") },
            dropScale: { ...slider("suminagashi.dropScale", "Drop scale", 46, 10, 100, 1, "%"), ...responsive("Drop scale changes the spacing field used by every drop.") },
            seed: { ...slider("suminagashi.seed", "Seed", 37, 1, 1000), ...responsive("Seed deterministically creates a new arrangement.") },
            randomize: {
              type: "actions",
              target: "actions.suminagashi",
              label: "Variations",
              actions: [
                { label: "Randomize", value: "suminagashi.randomize" },
                { label: "Randomize colors", value: "suminagashi.randomizeColors" },
                { label: "Shuffle palette", value: "suminagashi.shufflePalette" },
              ],
            },
          },
        },
        {
          title: "Water movement",
          controls: {
            flowAngle: { ...slider("suminagashi.flowAngle", "Flow angle", 18, 0, 360, 1, "°"), ...responsive("The flow basis is rotated in the shader.") },
            turbulence: { ...slider("suminagashi.turbulence", "Turbulence", 24, 0, 100, 1, "%"), ...responsive("Turbulence adds layered coordinate warping.") },
            turbulenceScale: { ...slider("suminagashi.turbulenceScale", "Turbulence scale", 42, 5, 100, 1, "%"), ...responsive("Scale changes the size of the fluid-like undulations.") },
            swirl: { ...slider("suminagashi.swirl", "Swirl", 35, 0, 100, 1, "%"), ...responsive("Swirl bends rings around the bath center.") },
            combStrength: { ...slider("suminagashi.combStrength", "Comb strength", 12, 0, 100, 1, "%"), ...responsive("Combing is a sinusoidal coordinate transform.") },
            combSpacing: { ...slider("suminagashi.combSpacing", "Comb spacing", 34, 4, 100), ...responsive("Spacing controls the virtual tine distance.") },
          },
        },
        {
          title: "Ink palette",
          controls: {
            palette: {
              type: "gradient",
              target: "suminagashi.palette",
              label: "Palette",
              defaultValue: {
                angle: 90,
                gradientType: "linear",
                stops: [
                  { color: "#101820", position: "0%" },
                  { color: "#19647E", position: "25%" },
                  { color: "#28AFB0", position: "52%" },
                  { color: "#F4D35E", position: "76%" },
                  { color: "#EE964B", position: "100%" },
                ],
              },
            },
            inkOpacity: { ...slider("suminagashi.inkOpacity", "Ink opacity", 76, 10, 100, 1, "%"), ...responsive("Opacity controls pigment coverage in one shader pass.") },
            paletteMix: { ...slider("suminagashi.paletteMix", "Palette mix", 72, 0, 100, 1, "%"), ...responsive("Mix controls how strongly neighboring ink colors overlap.") },
            invert: { type: "switch", target: "suminagashi.invert", label: "Invert palette", defaultValue: false },
          },
        },
        {
          title: "Paper",
          controls: {
            paper: { type: "color", target: "suminagashi.paper", label: "Paper", defaultValue: "#F3EBDD" },
            paperGrain: { ...slider("suminagashi.paperGrain", "Paper grain", 12, 0, 60, 1, "%"), ...responsive("Grain is a lightweight procedural finish.") },
            paperWarmth: { ...slider("suminagashi.paperWarmth", "Warmth", 58, 0, 100, 1, "%"), ...responsive("Warmth shifts the paper tone before compositing.") },
            contrast: { ...slider("suminagashi.contrast", "Contrast", 108, 70, 150, 1, "%"), ...responsive("Contrast is applied after the marbling field.") },
            brightness: { ...slider("suminagashi.brightness", "Brightness", 102, 70, 140, 1, "%"), ...responsive("Brightness is applied after the marbling field.") },
          },
        },
        {
          title: "Motion",
          controls: {
            animate: { type: "switch", target: "motion.animate", label: "Animate", defaultValue: false, ...responsive("Animation only advances shader time; the pattern stays deterministic.") },
            speed: { ...slider("motion.speed", "Speed", 22, 0, 100, 1, "%"), ...responsive("Speed changes the time phase of the shader.") },
          },
        },
        {
          title: "Background",
          controls: {
            includeBackground: { type: "switch", target: "export.includeBackground", label: "Include", defaultValue: true, description: "Controls preview and PNG transparency." },
          },
        },
        {
          title: "Image Export",
          controls: {
            imageFormat: { type: "select", target: "export.image.format", label: "Format", defaultValue: "png", options: [{ label: "PNG", value: "png" }, { label: "JPG", value: "jpg" }] },
            imageResolution: { type: "select", target: "export.image.resolution", label: "Resolution", defaultValue: "4k", options: [{ label: "2K", value: "2k" }, { label: "4K", value: "4k" }, { label: "8K", value: "8k" }], performanceRole: "workload", performanceReason: "Resolution controls exported pixel count." },
            videoResolution: { type: "select", target: "export.video.resolution", label: "Video", defaultValue: "current", options: [{ label: "Current", value: "current" }, { label: "4K", value: "4k" }], performanceRole: "workload", performanceReason: "Video resolution controls recorded pixel count." },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["imageFormat", "imageResolution"] }],
        },
        {
          title: "Export",
          actionGroup: "secondary",
          controls: {
            outputActions: {
              type: "export", target: "actions.output", label: false, defaultValue: null,
              exportBackgroundTarget: "suminagashi.paper", exportFileName: "suminagashi",
            },
          },
        },
      ],
    },
  },
  persistence: { storage: "localStorage", key: "toolcraft:suminagashi:state:v1", version: 1, include: ["values", "canvas", "panels"] },
  settingsTransfer: { enabled: true, appId: "suminagashi", fileName: "suminagashi-settings" },
  toolbar: { back: { href: withBasePath("/"), label: "Back to tools" }, history: true, radar: true, theme: true, zoom: true },
});
