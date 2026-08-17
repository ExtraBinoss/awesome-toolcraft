import { defineToolcraft } from "@/toolcraft/runtime/schema/define-toolcraft";
import { withBasePath } from "@/base-path";

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
      dataUrl: withBasePath("/baseAssets/images/gnou.jpg"),
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
            sourceMode: {
              type: "segmented",
              target: "source.mode",
              label: "Source type",
              defaultValue: "image",
              options: [
                { label: "Image", value: "image" },
                { label: "Text", value: "text" },
                { label: "3D", value: "3d" },
              ],
            },
            source: {
              type: "fileDrop",
              target: "media.source",
              label: false,
              defaultValue: null,
              accept: "image/*,video/*",
              assetKind: "file",
              description: "Drop an image or video here, or directly on the canvas.",
              visibleWhen: { target: "source.mode", equals: "image" },
            },
            text: {
              type: "code",
              target: "source.text",
              label: "Text",
              defaultValue: "TOOLCRAFT",
              textValueKind: "multiline",
              description: "A typographic source processed by the same dither or heatmap effect.",
              visibleWhen: { target: "source.mode", equals: "text" },
            },
          },
        },
        {
          title: "Text source",
          visibleWhen: { target: "source.mode", equals: "text" },
          controls: {
            font: {
              type: "select", target: "text.font", label: "Typeface", defaultValue: "sans",
              options: [{ label: "Grotesk", value: "sans" }, { label: "Terminal", value: "mono" }, { label: "Editorial", value: "serif" }],
            },
            weight: {
              type: "select", target: "text.weight", label: "Weight", defaultValue: "900",
              options: [{ label: "Regular", value: "400" }, { label: "Bold", value: "700" }, { label: "Black", value: "900" }],
            },
            size: { ...slider("text.size", "Scale", 34, 8, 80, 1, "%"), ...responsive("Text scale changes the generated source mask.") },
            tracking: { ...slider("text.tracking", "Tracking", 2, -10, 30, 1, "px"), ...responsive("Tracking changes spacing between source glyphs.") },
            lineHeight: { ...slider("text.lineHeight", "Line height", 0.92, 0.6, 1.6, 0.01), ...responsive("Line height changes multiline spacing.") },
            style: {
              type: "select", target: "text.style", label: "Style", defaultValue: "solid",
              options: [{ label: "Solid", value: "solid" }, { label: "Outline", value: "outline" }, { label: "Double", value: "double" }],
            },
          },
          layoutGroups: [
            { layout: "inline", columns: 2, controls: ["font", "weight"] },
            { layout: "inline", columns: 2, controls: ["size", "tracking"] },
          ],
        },
        {
          title: "3D source",
          visibleWhen: { target: "source.mode", equals: "3d" },
          controls: {
            shape: {
              type: "segmented", target: "three.shape", label: "Shape", defaultValue: "torus",
              options: [{ label: "Torus", value: "torus" }, { label: "Sphere", value: "sphere" }, { label: "Cube", value: "cube" }],
            },
            scale: { ...slider("three.scale", "Scale", 58, 20, 92, 1, "%"), ...responsive("Scale changes the procedural 3D source footprint.") },
            depth: { ...slider("three.depth", "Depth", 62, 0, 100, 1, "%"), ...responsive("Depth controls 3D shading contrast.") },
            tilt: { ...slider("three.tilt", "Tilt", 24, -80, 80, 1, "°"), ...responsive("Tilt changes the projection angle.") },
            wireframe: { type: "switch", target: "three.wireframe", label: "Wireframe", defaultValue: true },
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
              options: [{ label: "Dither", value: "dither" }, { label: "Heatmap", value: "heatmap" }, { label: "Halftone", value: "halftone" }],
              ...responsive("Changing mode swaps one image processing pass."),
            },
            fit: {
              type: "select",
              target: "media.fit",
              label: "Fit",
              defaultValue: "contain",
              options: [{ label: "Contain", value: "contain" }, { label: "Cover", value: "cover" }],
              visibleWhen: { target: "source.mode", equals: "image" },
            },
          },
        },
        {
          title: "Animation",
          controls: {
            enabled: { type: "switch", target: "animation.enabled", label: "Animate", defaultValue: true },
            cycles: { ...slider("animation.cycles", "Cycles", 1, 1, 8, 1, "×"), ...responsive("Integer cycles preserve a seamless timeline boundary.") },
            amplitude: { ...slider("animation.amplitude", "Dither motion", 45, 0, 100, 1, "%"), visibleWhen: { target: "effect.mode", equals: "dither" }, ...responsive("Motion animates the dither matrix and luminance threshold while the source stays fixed.") },
            halftoneMotion: { ...slider("halftone.motion", "Halftone motion", 45, 0, 100, 1, "%"), visibleWhen: { target: "effect.mode", equals: "halftone" }, ...responsive("Animates dot radius, grid phase, and grain on a seamless circular phase.") },
            rotateSource: { type: "switch", target: "animation.rotateSource", label: "Rotate source", defaultValue: true, visibleWhen: { target: "source.mode", equals: "3d" } },
            textMotion: {
              type: "select", target: "animation.textMotion", label: "Text motion", defaultValue: "float",
              options: [{ label: "Still", value: "still" }, { label: "Float", value: "float" }, { label: "Orbit", value: "orbit" }, { label: "Pulse", value: "pulse" }],
              visibleWhen: { target: "source.mode", equals: "text" },
            },
          },
        },
        {
          title: "Dither",
          visibleWhen: { target: "effect.mode", equals: "dither" },
          controls: {
            pattern: {
              type: "select", target: "dither.pattern", label: "Pattern", defaultValue: "4x4",
              options: [{ label: "Bayer 2 × 2", value: "2x2" }, { label: "Bayer 4 × 4", value: "4x4" }, { label: "Bayer 8 × 8", value: "8x8" }, { label: "Film noise", value: "noise" }],
            },
            colorMode: {
              type: "select", target: "dither.colorMode", label: "Color mode", defaultValue: "duotone",
              options: [{ label: "Duotone", value: "duotone" }, { label: "Original", value: "original" }],
            },
            pixelSize: { ...slider("dither.pixelSize", "Pixel size", 5, 1, 18, 1, "px"), ...responsive("Pixel size changes the sampled block size.") },
            posterize: { ...slider("dither.posterize", "Color steps", 2, 1, 7, 1), ...responsive("Paper's color-step uniform changes the quantization count.") },
            inverted: { type: "switch", target: "dither.inverted", label: "Invert luminance", defaultValue: false },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["pattern", "colorMode"] }],
        },
        {
          title: "Dither colors",
          visibleWhen: { target: "effect.mode", equals: "dither" },
          controls: {
            light: { type: "color", target: "dither.colorA", label: "Light", defaultValue: "#F5D500", visibleWhen: { target: "dither.colorMode", equals: "duotone" } },
            dark: { type: "color", target: "dither.colorB", label: "Dark", defaultValue: "#111116", visibleWhen: { target: "dither.colorMode", equals: "duotone" } },
            accent: { type: "color", target: "dither.colorC", label: "Highlight", defaultValue: "#F04D8C", visibleWhen: { target: "dither.colorMode", equals: "duotone" } },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["light", "dark"] }],
        },
        {
          title: "Halftone",
          visibleWhen: { target: "effect.mode", equals: "halftone" },
          controls: {
            type: {
              type: "select", target: "halftone.type", label: "Dot style", defaultValue: "gooey",
              options: [{ label: "Classic", value: "classic" }, { label: "Gooey", value: "gooey" }, { label: "Holes", value: "holes" }, { label: "Soft", value: "soft" }],
            },
            grid: {
              type: "segmented", target: "halftone.grid", label: "Grid", defaultValue: "hex",
              options: [{ label: "Square", value: "square" }, { label: "Hex", value: "hex" }],
            },
            originalColors: { type: "switch", target: "halftone.originalColors", label: "Original image colors", defaultValue: false },
            inverted: { type: "switch", target: "halftone.inverted", label: "Invert luminance", defaultValue: false },
            size: { ...slider("halftone.size", "Grid size", 50, 0, 100, 1, "%"), ...responsive("Paper's halftone grid-size uniform.") },
            radius: { ...slider("halftone.radius", "Dot radius", 125, 0, 200, 1, "%"), ...responsive("Paper's maximum dot radius relative to each cell.") },
            contrast: { ...slider("halftone.contrast", "Contrast", 40, 0, 100, 1, "%"), ...responsive("Paper's sampled-image contrast.") },
          },
          layoutGroups: [
            { layout: "inline", columns: 2, controls: ["type", "grid"] },
            { layout: "inline", columns: 2, controls: ["originalColors", "inverted"] },
            { layout: "inline", columns: 2, controls: ["size", "radius"] },
          ],
        },
        {
          title: "Halftone colors",
          visibleWhen: { target: "effect.mode", equals: "halftone" },
          controls: {
            foreground: { type: "color", target: "halftone.colorFront", label: "Dots", defaultValue: "#2B2B2B", visibleWhen: { target: "halftone.originalColors", equals: false } },
            background: { type: "color", target: "halftone.colorBack", label: "Background", defaultValue: "#F2F1E8" },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["foreground", "background"] }],
        },
        {
          title: "Halftone grain",
          visibleWhen: { target: "effect.mode", equals: "halftone" },
          controls: {
            grainMixer: { ...slider("halftone.grainMixer", "Edge distortion", 20, 0, 100, 1, "%"), ...responsive("Paper grain distortion applied to dot edges.") },
            grainOverlay: { ...slider("halftone.grainOverlay", "Grain overlay", 20, 0, 100, 1, "%"), ...responsive("Paper black-and-white grain post-process.") },
            grainSize: { ...slider("halftone.grainSize", "Grain size", 50, 0, 100, 1, "%"), ...responsive("Paper grain scale shared by distortion and overlay.") },
          },
        },
        {
          title: "Halftone placement",
          visibleWhen: { target: "effect.mode", equals: "halftone" },
          controls: {
            scale: { ...slider("halftone.scale", "Scale", 100, 1, 400, 1, "%"), ...responsive("Paper shader object scale.") },
            rotation: { ...slider("halftone.rotation", "Rotation", 0, 0, 360, 1, "°"), ...responsive("Paper shader object rotation.") },
            offsetX: { ...slider("halftone.offsetX", "Offset X", 0, -1, 1, 0.01), ...responsive("Paper shader horizontal offset.") },
            offsetY: { ...slider("halftone.offsetY", "Offset Y", 0, -1, 1, 0.01), ...responsive("Paper shader vertical offset.") },
            originX: { ...slider("halftone.originX", "Origin X", 50, 0, 100, 1, "%"), ...responsive("Paper shader horizontal transform origin.") },
            originY: { ...slider("halftone.originY", "Origin Y", 50, 0, 100, 1, "%"), ...responsive("Paper shader vertical transform origin.") },
            worldWidth: { ...slider("halftone.worldWidth", "World width", 100, 1, 400, 1, "%"), ...responsive("Paper shader virtual world width.") },
            worldHeight: { ...slider("halftone.worldHeight", "World height", 100, 1, 400, 1, "%"), ...responsive("Paper shader virtual world height.") },
          },
          layoutGroups: [
            { layout: "inline", columns: 2, controls: ["scale", "rotation"] },
            { layout: "inline", columns: 2, controls: ["offsetX", "offsetY"] },
            { layout: "inline", columns: 2, controls: ["originX", "originY"] },
            { layout: "inline", columns: 2, controls: ["worldWidth", "worldHeight"] },
          ],
        },
        {
          title: "Dither placement",
          visibleWhen: { target: "effect.mode", equals: "dither" },
          controls: {
            scale: { ...slider("dither.scale", "Scale", 100, 1, 400, 1, "%"), ...responsive("Paper shader object scale.") },
            rotation: { ...slider("dither.rotation", "Rotation", 0, 0, 360, 1, "°"), ...responsive("Paper shader object rotation.") },
            offsetX: { ...slider("dither.offsetX", "Offset X", 0, -1, 1, 0.01), ...responsive("Paper shader horizontal offset.") },
            offsetY: { ...slider("dither.offsetY", "Offset Y", 0, -1, 1, 0.01), ...responsive("Paper shader vertical offset.") },
            originX: { ...slider("dither.originX", "Origin X", 50, 0, 100, 1, "%"), ...responsive("Paper shader horizontal transform origin.") },
            originY: { ...slider("dither.originY", "Origin Y", 50, 0, 100, 1, "%"), ...responsive("Paper shader vertical transform origin.") },
            worldWidth: { ...slider("dither.worldWidth", "World width", 100, 1, 400, 1, "%"), ...responsive("Paper shader virtual world width.") },
            worldHeight: { ...slider("dither.worldHeight", "World height", 100, 1, 400, 1, "%"), ...responsive("Paper shader virtual world height.") },
          },
          layoutGroups: [
            { layout: "inline", columns: 2, controls: ["scale", "rotation"] },
            { layout: "inline", columns: 2, controls: ["offsetX", "offsetY"] },
            { layout: "inline", columns: 2, controls: ["originX", "originY"] },
            { layout: "inline", columns: 2, controls: ["worldWidth", "worldHeight"] },
          ],
        },
        {
          title: "Heatmap",
          visibleWhen: { target: "effect.mode", equals: "heatmap" },
          controls: {
            contour: { ...slider("heatmap.contour", "Contour", 45, 0, 100, 1, "%"), ...responsive("Contour changes isoline intensity.") },
            noise: { ...slider("heatmap.noise", "Noise", 22, 0, 100, 1, "%"), ...responsive("Noise adds a procedural signal before palette mapping.") },
            innerGlow: { ...slider("heatmap.innerGlow", "Inner glow", 58, 0, 100, 1, "%"), ...responsive("Paper's inner heated-area size.") },
            outerGlow: { ...slider("heatmap.outerGlow", "Outer glow", 58, 0, 100, 1, "%"), ...responsive("Paper's outer heated-area size.") },
            angle: { ...slider("heatmap.angle", "Direction", 0, 0, 360, 1, "°"), ...responsive("Direction rotates the animated heat field.") },
            colorBack: { type: "color", target: "heatmap.colorBack", label: "Background", defaultValue: "#0D0D11" },
          },
        },
        {
          title: "Heatmap placement",
          visibleWhen: { target: "effect.mode", equals: "heatmap" },
          controls: {
            scale: { ...slider("heatmap.scale", "Scale", 75, 1, 400, 1, "%"), ...responsive("Paper shader object scale.") },
            rotation: { ...slider("heatmap.rotation", "Rotation", 0, 0, 360, 1, "°"), ...responsive("Paper shader object rotation.") },
            offsetX: { ...slider("heatmap.offsetX", "Offset X", 0, -1, 1, 0.01), ...responsive("Paper shader horizontal offset.") },
            offsetY: { ...slider("heatmap.offsetY", "Offset Y", 0, -1, 1, 0.01), ...responsive("Paper shader vertical offset.") },
            originX: { ...slider("heatmap.originX", "Origin X", 50, 0, 100, 1, "%"), ...responsive("Paper shader horizontal transform origin.") },
            originY: { ...slider("heatmap.originY", "Origin Y", 50, 0, 100, 1, "%"), ...responsive("Paper shader vertical transform origin.") },
            worldWidth: { ...slider("heatmap.worldWidth", "World width", 100, 1, 400, 1, "%"), ...responsive("Paper shader virtual world width.") },
            worldHeight: { ...slider("heatmap.worldHeight", "World height", 100, 1, 400, 1, "%"), ...responsive("Paper shader virtual world height.") },
          },
          layoutGroups: [
            { layout: "inline", columns: 2, controls: ["scale", "rotation"] },
            { layout: "inline", columns: 2, controls: ["offsetX", "offsetY"] },
            { layout: "inline", columns: 2, controls: ["originX", "originY"] },
            { layout: "inline", columns: 2, controls: ["worldWidth", "worldHeight"] },
          ],
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
            export: {
              type: "export",
              target: "media.export",
              label: false,
              defaultValue: null,
              exportFileName: "dither-heatmap",
              exportOutputSelector: "[data-toolcraft-dither-heatmap-output='true'] canvas",
            },
          },
        },
      ],
    },
    timeline: { mode: "playback", defaultDurationSeconds: 8 },
  },
  persistence: { storage: "localStorage", key: "toolcraft:dither-heatmap:state:v3", version: 3, include: ["values", "media", "canvas", "panels", "timeline"] },
  settingsTransfer: { enabled: true, appId: "dither-heatmap", fileName: "dither-heatmap-settings" },
  toolbar: { back: { href: withBasePath("/"), label: "Back to tools" }, history: true, radar: true, theme: true, zoom: true },
});
