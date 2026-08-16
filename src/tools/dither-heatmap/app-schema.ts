import { defineToolcraft } from "@/toolcraft/runtime/schema/define-toolcraft";

const responsive = (performanceReason: string) => ({
  performanceRole: "responsiveness" as const,
  performanceReason,
});

const slider = (target: string, label: string, defaultValue: number, min: number, max: number, step = 1, unit?: string) => ({
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
    draggable: false,
    renderScale: false,
    size: { width: 1280, height: 720, unit: "px" },
    sizing: { mode: "fixed-output" },
    upload: true,
  },
  export: { png: { background: "transparent" } },
  media: {
    defaultAssets: [{
      id: "dither-default-gnou",
      assetKind: "image",
      dataUrl: "/baseAssets/images/gnou.jpg",
      fileName: "gnou.jpg",
      mimeType: "image/jpeg",
      position: { x: 0, y: 0 },
      sourceTarget: "media.source",
    }],
  },
  panels: {
    controls: {
      title: "Dither / Heatmap",
      sections: [
        {
          title: "Source",
          controls: {
            source: {
              type: "fileDrop",
              target: "media.source",
              label: false,
              defaultValue: null,
              accept: "image/*,video/*",
              assetKind: "file",
              description: "Drop an image or video here, or directly on the canvas.",
            },
          },
        },
        {
          title: "Effect",
          controls: {
            mode: {
              type: "segmented",
              target: "effect.mode",
              label: false,
              defaultValue: "dither",
              options: [{ label: "Dither", value: "dither" }, { label: "Heatmap", value: "heatmap" }],
              ...responsive("Changing mode swaps one image processing pass."),
            },
            fit: {
              type: "select",
              target: "media.fit",
              label: "Fit",
              defaultValue: "contain",
              options: [{ label: "Contain", value: "contain" }, { label: "Cover", value: "cover" }],
            },
          },
        },
        {
          title: "Dither",
          visibleWhen: { target: "effect.mode", equals: "dither" },
          controls: {
            pattern: {
              type: "select", target: "dither.pattern", label: "Pattern", defaultValue: "ordered",
              options: [{ label: "Ordered 4 × 4", value: "ordered" }, { label: "Film noise", value: "noise" }, { label: "Checker", value: "checker" }],
            },
            colorMode: {
              type: "select", target: "dither.colorMode", label: "Color mode", defaultValue: "duotone",
              options: [{ label: "Duotone", value: "duotone" }, { label: "Monochrome", value: "monochrome" }, { label: "Grayscale", value: "grayscale" }, { label: "RGB split", value: "rgb" }],
            },
            pixelSize: { ...slider("dither.pixelSize", "Pixel size", 5, 1, 18, 1, "px"), ...responsive("Pixel size changes the sampled block size.") },
            threshold: { ...slider("dither.threshold", "Threshold", 50, 0, 100, 1, "%"), ...responsive("Threshold shifts the luminance decision boundary.") },
            contrast: { ...slider("dither.contrast", "Contrast", 100, 0, 220, 1, "%"), ...responsive("Contrast is applied before quantization.") },
            posterize: { ...slider("dither.posterize", "Posterize levels", 2, 2, 8, 1, "lv"), ...responsive("Posterize levels change the quantization count.") },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["pattern", "colorMode"] }],
        },
        {
          title: "Dither colors",
          visibleWhen: { target: "effect.mode", equals: "dither" },
          controls: {
            light: { type: "color", target: "dither.colorA", label: "Light", defaultValue: "#F5D500" },
            dark: { type: "color", target: "dither.colorB", label: "Dark", defaultValue: "#111116" },
            accent: { type: "color", target: "dither.colorC", label: "RGB accent", defaultValue: "#F04D8C", visibleWhen: { target: "dither.colorMode", equals: "rgb" } },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["light", "dark"] }],
        },
        {
          title: "Heatmap",
          visibleWhen: { target: "effect.mode", equals: "heatmap" },
          controls: {
            contour: { ...slider("heatmap.contour", "Contour", 45, 0, 100, 1, "%"), ...responsive("Contour changes isoline intensity.") },
            noise: { ...slider("heatmap.noise", "Noise", 22, 0, 100, 1, "%"), ...responsive("Noise adds a procedural signal before palette mapping.") },
            glow: { ...slider("heatmap.glow", "Glow", 58, 0, 100, 1, "%"), ...responsive("Glow brightens high-value areas.") },
            angle: { ...slider("heatmap.angle", "Direction", 0, 0, 360, 1, "°"), ...responsive("Direction rotates the animated heat field.") },
            motion: { ...slider("heatmap.motion", "Motion", 20, 0, 100, 1, "%"), ...responsive("Motion controls procedural heat drift.") },
          },
        },
        {
          title: "Heat palette",
          visibleWhen: { target: "effect.mode", equals: "heatmap" },
          controls: {
            palette: {
              type: "gradient",
              target: "heatmap.palette",
              label: false,
              defaultValue: {
                angle: 90,
                gradientType: "linear",
                stops: [
                  { color: "#15002D", position: "0%" },
                  { color: "#3C2E9D", position: "25%" },
                  { color: "#E63151", position: "55%" },
                  { color: "#FF9F43", position: "78%" },
                  { color: "#FFE98A", position: "100%" },
                ],
              },
              ...responsive("Palette stops remap luminance without changing media decoding."),
            },
            presets: {
              type: "actions",
              target: "actions.palette",
              label: "Presets",
              actions: [{ label: "Inferno", value: "palette.inferno" }, { label: "Ocean", value: "palette.ocean" }, { label: "Acid", value: "palette.acid" }, { label: "Mono", value: "palette.mono" }],
            },
          },
        },
        {
          title: "Background",
          controls: {
            includeBackground: { type: "switch", target: "export.includeBackground", label: "Include", defaultValue: true, description: "Controls preview letterboxing and PNG transparency." },
            background: { type: "color", target: "appearance.background", label: false, defaultValue: "#0D0D11" },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["includeBackground", "background"] }],
        },
        {
          title: "Export settings",
          controls: {
            imageFormat: { type: "select", target: "export.image.format", label: "Image", defaultValue: "png", options: [{ label: "PNG", value: "png" }, { label: "JPG", value: "jpg" }] },
            imageResolution: { type: "select", target: "export.image.resolution", label: "Resolution", defaultValue: "2k", options: [{ label: "Current", value: "current" }, { label: "2K", value: "2k" }, { label: "4K", value: "4k" }, { label: "8K", value: "8k" }], performanceRole: "workload", performanceReason: "Resolution controls exported pixel count." },
            videoResolution: { type: "select", target: "export.video.resolution", label: "Video", defaultValue: "current", options: [{ label: "Current", value: "current" }, { label: "4K", value: "4k" }], performanceRole: "workload", performanceReason: "Video resolution controls recording canvas size." },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["imageFormat", "imageResolution"] }],
        },
        {
          title: "Export",
          actionGroup: "secondary",
          controls: {
            export: { type: "ditherHeatmapExport", target: "media.export", label: false, defaultValue: null },
          },
        },
      ],
    },
    timeline: { mode: "playback", defaultDurationSeconds: 8 },
  },
  persistence: { storage: "localStorage", key: "toolcraft:dither-heatmap:state:v2", version: 2, include: ["values", "media", "canvas", "panels", "timeline"] },
  settingsTransfer: { enabled: true, appId: "dither-heatmap", fileName: "dither-heatmap-settings" },
  toolbar: { back: { href: "/", label: "Back to tools" }, history: true, radar: true, theme: true, zoom: true },
});
