import { defineToolcraft } from "@/toolcraft/runtime/schema/define-toolcraft";

const responsive = (performanceReason: string) => ({
  performanceReason,
  performanceRole: "responsiveness" as const,
});

const workload = (performanceReason: string) => ({
  performanceReason,
  performanceRole: "workload" as const,
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
  defaultValue,
  label,
  max,
  min,
  sliderValueKind: step < 1 ? "continuous" : "discrete",
  step,
  target,
  type: "slider",
  unit,
} as const);

export const appSchema = defineToolcraft({
  canvas: {
    draggable: false,
    enabled: true,
    renderScale: { defaultValue: 1, enabled: true, max: 2, min: 0.5, step: 0.25 },
    size: { height: 720, unit: "px", width: 1280 },
    sizing: { mode: "fixed-output" },
    upload: true,
  },
  export: { png: { background: "include" } },
  media: {
    defaultAssets: [
      {
        assetKind: "image",
        dataUrl: "/baseAssets/images/gnou.jpg",
        fileName: "gnou.jpg",
        id: "ascii-lab-default-gnou",
        mimeType: "image/jpeg",
        position: { x: 0, y: 0 },
        sourceTarget: "ascii.source",
      },
    ],
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            source: {
              accept: ".png,.jpg,.jpeg,.webp,.avif,.gif,.glb,.gltf,.obj,.stl",
              assetKind: "file",
              defaultValue: null,
              description: "Drop an image or a GLB, GLTF, OBJ or STL model.",
              label: false,
              target: "ascii.source",
              type: "fileDrop",
            },
          },
          title: "Source",
        },
        {
          controls: {
            mode: {
              defaultValue: "hybrid",
              label: "Mapping",
              options: [
                { label: "Image tone", value: "tone" },
                { label: "3D depth", value: "depth" },
                { label: "Hybrid", value: "hybrid" },
              ],
              target: "ascii.mode",
              type: "select",
              ...responsive("Mapping changes the scalar field used to choose characters."),
            },
            fit: {
              defaultValue: "contain",
              label: "Fit",
              options: [
                { label: "Contain", value: "contain" },
                { label: "Cover", value: "cover" },
              ],
              target: "ascii.fit",
              type: "select",
            },
            charset: {
              defaultValue: " .,:;irsXA253hMHGS#9B&@",
              label: "Character set",
              target: "ascii.charset",
              textValueKind: "multiline",
              type: "code",
              ...responsive("The atlas is rebuilt only when the character set changes."),
            },
            preset: {
              actions: [
                { label: "Classic", value: "charset.classic" },
                { label: "Blocks", value: "charset.blocks" },
                { label: "Minimal", value: "charset.minimal" },
                { label: "Braille", value: "charset.braille" },
              ],
              label: "Presets",
              target: "actions.charset",
              type: "actions",
            },
          },
          title: "ASCII language",
        },
        {
          controls: {
            cellSize: {
              ...slider("ascii.cellSize", "Cell size", 12, 5, 32, 1, "px"),
              ...workload("Cell size controls the number of glyphs rendered per frame."),
            },
            contrast: {
              ...slider("ascii.contrast", "Contrast", 1.2, 0.2, 2.8, 0.05),
              ...responsive("Contrast is applied before character quantization."),
            },
            brightness: {
              ...slider("ascii.brightness", "Brightness", 0, -0.5, 0.5, 0.01),
              ...responsive("Brightness shifts the tone field before mapping."),
            },
            invert: {
              defaultValue: false,
              label: "Invert characters",
              target: "ascii.invert",
              type: "switch",
            },
            jitter: {
              ...slider("ascii.jitter", "Organic jitter", 18, 0, 100, 1, "%"),
              ...responsive("Jitter adds deterministic variation without changing the source."),
            },
          },
          layoutGroups: [{ columns: 2, controls: ["invert", "jitter"], layout: "inline" }],
          title: "Glyph shaping",
        },
        {
          controls: {
            colorMode: {
              defaultValue: "source",
              label: "Color mode",
              options: [
                { label: "Source color", value: "source" },
                { label: "Custom ink", value: "custom" },
                { label: "Neon gradient", value: "gradient" },
              ],
              target: "ascii.colorMode",
              type: "select",
            },
            foreground: {
              defaultValue: "#D8FF65",
              label: "Foreground",
              target: "ascii.foreground",
              type: "color",
              visibleWhen: { target: "ascii.colorMode", notEquals: "source" },
            },
            background: {
              defaultValue: "#050609",
              label: "Background",
              target: "ascii.background",
              type: "color",
            },
            inkMix: {
              ...slider("ascii.inkMix", "Ink intensity", 92, 0, 100, 1, "%"),
              ...responsive("Ink intensity controls the blend between source and generated color."),
            },
          },
          layoutGroups: [{ columns: 2, controls: ["foreground", "background"], layout: "inline" }],
          title: "Ink & palette",
        },
        {
          controls: {
            depthStrength: {
              ...slider("ascii.depthStrength", "Depth strength", 65, 0, 100, 1, "%"),
              ...responsive("Depth strength mixes model lighting/depth into character selection."),
            },
            depthContrast: {
              ...slider("ascii.depthContrast", "Depth contrast", 1.3, 0.2, 3, 0.05),
              ...responsive("Depth contrast sharpens the model field."),
            },
            direction: {
              defaultValue: "right",
              label: "Animation direction",
              options: [
                { label: "Right", value: "right" },
                { label: "Left", value: "left" },
                { label: "Up", value: "up" },
                { label: "Down", value: "down" },
                { label: "Up right", value: "up-right" },
                { label: "Up left", value: "up-left" },
                { label: "Down right", value: "down-right" },
                { label: "Down left", value: "down-left" },
                { label: "Clockwise", value: "clockwise" },
                { label: "Counter-clockwise", value: "counter-clockwise" },
                { label: "Radial out", value: "radial-out" },
                { label: "Radial in", value: "radial-in" },
              ],
              target: "ascii.direction",
              type: "select",
            },
            motion: {
              ...slider("ascii.motion", "Motion", 18, 0, 100, 1, "%"),
              ...responsive("Motion changes the animated depth field."),
            },
          },
          title: "Depth field",
          visibleWhen: { target: "ascii.mode", notEquals: "tone" },
        },
        {
          controls: {
            autoRotate: {
              defaultValue: true,
              label: "Auto rotate model",
              target: "motion.autoRotate",
              type: "switch",
            },
            rotationSpeed: {
              ...slider("motion.rotationSpeed", "Rotation speed", 24, 0, 100, 1, "%"),
              ...responsive("Rotation updates the model transform only."),
            },
            animate: {
              defaultValue: true,
              label: "Animate field",
              target: "motion.animate",
              type: "switch",
            },
            previewFps: {
              defaultValue: "30",
              label: "Preview FPS",
              options: [
                { label: "24 FPS", value: "24" },
                { label: "30 FPS", value: "30" },
                { label: "60 FPS", value: "60" },
              ],
              target: "performance.fps",
              type: "select",
              ...workload("Preview FPS limits demand-rendered Three.js frames."),
            },
          },
          title: "Motion",
        },
        {
          controls: {
            paperAmbient: {
              defaultValue: false,
              description: "Adds a subtle Paper Shaders dithering atmosphere behind the ASCII output.",
              label: "Paper atmosphere",
              target: "paper.ambient",
              type: "switch",
              ...workload("Paper atmosphere creates a second lightweight shader surface."),
            },
            background: {
              defaultValue: "#020307",
              label: "Canvas background",
              target: "scene.background",
              type: "color",
            },
          },
          title: "Stage",
        },
        {
          controls: {
            imageResolution: {
              defaultValue: "2k",
              label: "Image resolution",
              options: [
                { label: "Current", value: "current" },
                { label: "2K", value: "2k" },
                { label: "4K", value: "4k" },
                { label: "8K", value: "8k" },
              ],
              target: "export.image.resolution",
              type: "select",
              ...workload("Export resolution controls pixel count."),
            },
            videoResolution: {
              defaultValue: "current",
              label: "Video resolution",
              options: [
                { label: "Current", value: "current" },
                { label: "4K", value: "4k" },
              ],
              target: "export.video.resolution",
              type: "select",
              ...workload("Video resolution controls recording canvas size."),
            },
          },
          layoutGroups: [{ columns: 2, controls: ["imageResolution", "videoResolution"], layout: "inline" }],
          title: "Export settings",
        },
        {
          actionGroup: "secondary",
          controls: {
            export: {
              defaultValue: null,
              label: false,
              target: "ascii.export",
              type: "asciiLabExport",
            },
          },
          title: "Export",
        },
      ],
      title: "ASCII Lab",
    },
    timeline: { defaultDurationSeconds: 10, mode: "playback" },
  },
  persistence: {
    include: ["values", "media", "canvas", "panels", "timeline"],
    key: "toolcraft:ascii-lab:state:v2",
    storage: "localStorage",
    version: 2,
  },
  settingsTransfer: { appId: "ascii-lab", enabled: true, fileName: "ascii-lab-settings" },
  toolbar: {
    back: { href: "/", label: "Back to tools" },
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
