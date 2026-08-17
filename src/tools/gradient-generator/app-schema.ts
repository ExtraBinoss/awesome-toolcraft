import { defineToolcraft } from "@/toolcraft/runtime/schema/define-toolcraft";
import { logToolLoad } from "@/tool-load-debug";
import { withBasePath } from "@/base-path";

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
          title: "Content",
          controls: {
            mode: {
              type: "segmented", target: "content.mode", label: "Mode", defaultValue: "gradient",
              options: [{ label: "Gradient", value: "gradient" }, { label: "Gradient + text", value: "text" }, { label: "Gradient + image", value: "image" }],
              ...responsiveness("Mode composites the same procedural gradient either full-frame or through a cached text mask."),
            },
            text: {
              type: "code", target: "text.content", label: "Text", defaultValue: "TOOL\nCRAFT", textValueKind: "multiline",
              visibleWhen: { target: "content.mode", equals: "text" },
              ...responsiveness("Text rebuilds the GPU mask only when its content changes."),
            },
          },
        },
        {
          title: "Image overlay",
          visibleWhen: { target: "content.mode", equals: "image" },
          controls: {
            image: { type: "fileDrop", target: "image.source", label: false, defaultValue: null, accept: "image/*", assetKind: "image", description: "Import an image or choose one from the shared Toolcraft library.", visibleWhen: { target: "content.mode", equals: "image" } },
            imageFit: { type: "select", target: "image.fit", label: "Fit", defaultValue: "contain", options: [{ label: "Contain", value: "contain" }, { label: "Cover", value: "cover" }, { label: "Stretch", value: "stretch" }], visibleWhen: { target: "content.mode", equals: "image" } },
            imageBlend: { type: "select", target: "image.blend", label: "Blend", defaultValue: "normal", options: [{ label: "Normal", value: "normal" }, { label: "Screen", value: "screen" }, { label: "Multiply", value: "multiply" }, { label: "Overlay", value: "overlay" }], visibleWhen: { target: "content.mode", equals: "image" } },
            imageOpacity: { type: "slider", target: "image.opacity", label: "Opacity", defaultValue: 88, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", visibleWhen: { target: "content.mode", equals: "image" }, ...responsiveness("Opacity is a single GPU blend uniform.") },
            imageScale: { type: "slider", target: "image.scale", label: "Scale", defaultValue: 100, min: 20, max: 240, step: 1, unit: "%", sliderValueKind: "continuous", visibleWhen: { target: "content.mode", equals: "image" }, ...responsiveness("Scale changes texture coordinates only.") },
            imageX: { type: "slider", target: "image.x", label: "Position X", defaultValue: 0, min: -100, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", visibleWhen: { target: "content.mode", equals: "image" }, ...responsiveness("Position changes texture coordinates only.") },
            imageY: { type: "slider", target: "image.y", label: "Position Y", defaultValue: 0, min: -100, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", visibleWhen: { target: "content.mode", equals: "image" }, ...responsiveness("Position changes texture coordinates only.") },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["imageFit", "imageBlend"] }, { layout: "inline", columns: 2, controls: ["imageX", "imageY"] }],
        },
        {
          title: "Typography",
          visibleWhen: { target: "content.mode", equals: "text" },
          controls: {
            typography: {
              type: "fontPicker", target: "text.typography", label: "Typography",
              defaultValue: { color: "#FFFFFF", fontId: "inter", fontSize: 180, fontWeight: "800", letterSpacing: "normal", lineHeight: "tight", opacity: 100, textCase: "original" },
              visibleWhen: { target: "content.mode", equals: "text" },
              ...responsiveness("Font selection and typography rebuild the cached mask only after a committed change."),
            },
          },
        },
        {
          title: "Text Fill",
          visibleWhen: { target: "content.mode", equals: "text" },
          controls: {
            independentFill: {
              type: "switch", target: "text.fill.enabled", label: "Independent fill", defaultValue: false,
              ...responsiveness("Independent text fill switches between the background field and dedicated text uniforms."),
            },
            fillMode: {
              type: "segmented", target: "text.fill.mode", label: "Fill", defaultValue: "solid",
              options: [{ label: "Solid", value: "solid" }, { label: "Gradient", value: "gradient" }],
              visibleWhen: { target: "text.fill.enabled", equals: true },
            },
            fillColor: {
              type: "color", target: "text.fill.color", label: "Solid color", defaultValue: "#FFFFFF",
              visibleWhen: { target: "text.fill.enabled", equals: true },
              ...responsiveness("Solid text color updates one shader uniform."),
            },
            fillGradient: {
              type: "gradient", target: "text.fill.gradient", label: "Text gradient",
              defaultValue: { angle: 35, gradientType: "linear", stops: [
                { color: "#FFFFFF", position: "0%" },
                { color: "#7DD3FC", position: "45%" },
                { color: "#C084FC", position: "100%" },
              ] },
              visibleWhen: { target: "text.fill.enabled", equals: true },
              ...responsiveness("The independent text gradient is evaluated directly in the text mask."),
            },
            fillRandomize: {
              type: "actions", target: "actions.textFill", label: "Variations", defaultValue: null,
              visibleWhen: { target: "text.fill.enabled", equals: true },
              actions: [
                { label: "Random solid", value: "textFill.randomSolid" },
                { label: "Random gradient", value: "textFill.randomGradient" },
              ],
            },
          },
        },
        {
          title: "Text Relief",
          visibleWhen: { target: "content.mode", equals: "text" },
          controls: {
            relief: { type: "slider", target: "text.relief", label: "Relief", defaultValue: 58, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", visibleWhen: { target: "content.mode", equals: "text" }, ...responsiveness("Relief changes GPU lighting intensity.") },
            bevel: { type: "slider", target: "text.bevel", label: "Bevel", defaultValue: 42, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", visibleWhen: { target: "content.mode", equals: "text" }, ...responsiveness("Bevel samples the cached mask around glyph edges on the GPU.") },
            depth: { type: "slider", target: "text.depth", label: "Depth", defaultValue: 28, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", visibleWhen: { target: "content.mode", equals: "text" }, ...responsiveness("Depth controls the extruded silhouette offset.") },
            lightAngle: { type: "slider", target: "text.lightAngle", label: "Light angle", defaultValue: 315, min: 0, max: 360, step: 1, unit: "°", sliderValueKind: "continuous", visibleWhen: { target: "content.mode", equals: "text" }, ...responsiveness("Light angle rotates the relief lighting vector.") },
            shadow: { type: "slider", target: "text.shadow", label: "Shadow", defaultValue: 48, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", visibleWhen: { target: "content.mode", equals: "text" }, ...responsiveness("Shadow darkens the GPU extrusion behind the text.") },
            shine: { type: "slider", target: "text.shine", label: "Shine", defaultValue: 36, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", visibleWhen: { target: "content.mode", equals: "text" }, ...responsiveness("Shine adds a narrow highlight along lit bevel edges.") },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["relief", "bevel"] }, { layout: "inline", columns: 2, controls: ["depth", "shadow"] }],
        },
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
            blur: { type: "slider", target: "gradient.blur", label: "Blur", defaultValue: 0, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Blur softens the procedural gradient before text or image compositing.") },
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
            speed: { type: "slider", target: "motion.speed", label: "Flow motion", defaultValue: 32, min: 0, max: 100, step: 1, unit: "%", sliderValueKind: "continuous", ...responsiveness("Flow motion controls orbit amplitude while timeline duration controls loop speed.") },
            cycles: { type: "slider", target: "motion.cycles", label: "Loop cycles", defaultValue: 1, min: 1, max: 8, step: 1, unit: "×", sliderValueKind: "discrete", ...responsiveness("Integer cycles guarantee an identical first and last frame.") },
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
              exportBackgroundTarget: "appearance.background", exportFileName: "gradient-generator",
            },
          },
        },
      ],
    },
    timeline: { mode: "playback", defaultDurationSeconds: 8 },
  },
  persistence: { storage: "localStorage", key: "toolcraft:gradient-generator:state:v4", version: 4, include: ["values", "media", "canvas", "panels", "timeline"] },
  settingsTransfer: { enabled: true, appId: "gradient-generator", fileName: "gradient-generator-settings" },
  toolbar: { back: { href: withBasePath("/"), label: "Back to tools" }, history: true, radar: true, theme: true, zoom: true },
});

logToolLoad("module:evaluated gradient schema:end");
