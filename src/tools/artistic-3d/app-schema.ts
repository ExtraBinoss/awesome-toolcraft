import { defineToolcraft } from "@/toolcraft/runtime/schema/define-toolcraft";

const responsive = (performanceReason: string) => ({ performanceRole: "responsiveness" as const, performanceReason });
const slider = (target: string, label: string, defaultValue: number, min: number, max: number, step = 1, unit?: string) => ({ type: "slider", target, label, defaultValue, min, max, step, unit, sliderValueKind: step < 1 ? "continuous" : "discrete" } as const);

export const appSchema = defineToolcraft({
  canvas: { enabled: true, draggable: false, renderScale: { enabled: true, defaultValue: 1, min: 1, max: 2, step: .25 }, size: { width: 1280, height: 720, unit: "px" }, sizing: { mode: "fixed-output" }, upload: true },
  export: { png: { background: "include" } },
  panels: {
    controls: {
      title: "Artistic 3D",
      sections: [
        {
          title: "3D object",
          controls: {
            source: { type: "fileDrop", target: "model.source", label: false, defaultValue: null, accept: ".glb,.gltf,.obj,.stl", assetKind: "file", description: "GLB, GLTF, OBJ or STL. Drop the file here or directly on the canvas." },
            scale: { ...slider("model.scale", "Object scale", 100, 25, 200, 1, "%"), ...responsive("Scale updates the scene transform only.") },
          },
        },
        {
          title: "Effect",
          controls: {
            mode: { type: "select", target: "effect.mode", label: "Material", defaultValue: "dither", options: [{ label: "Dither", value: "dither" }, { label: "Heatmap", value: "heatmap" }, { label: "Liquid Metal", value: "liquid-metal" }, { label: "Gem Smoke", value: "gem-smoke" }], ...responsive("Effect selection swaps material uniforms in the same shader.") },
          },
        },
        {
          title: "Dither",
          visibleWhen: { target: "effect.mode", equals: "dither" },
          controls: {
            pixelSize: { ...slider("dither.pixelSize", "Pixel size", 4, 1, 16, 1, "px"), ...responsive("Pixel size changes screen-space dither cells.") },
            contrast: { ...slider("dither.contrast", "Contrast", 72, 0, 100, 1, "%"), ...responsive("Contrast changes tone separation.") },
            motion: { ...slider("dither.motion", "Motion", 24, 0, 100, 1, "%"), ...responsive("Motion changes procedural surface drift.") },
            light: { type: "color", target: "dither.light", label: "Light", defaultValue: "#F5D500" },
            dark: { type: "color", target: "dither.dark", label: "Dark", defaultValue: "#111116" },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["light", "dark"] }],
        },
        {
          title: "Heatmap",
          visibleWhen: { target: "effect.mode", equals: "heatmap" },
          controls: {
            contour: { ...slider("heatmap.contour", "Contour", 48, 0, 100, 1, "%"), ...responsive("Contour changes heat band density.") },
            noise: { ...slider("heatmap.noise", "Noise", 34, 0, 100, 1, "%"), ...responsive("Noise warps the mapped surface field.") },
            glow: { ...slider("heatmap.glow", "Glow", 64, 0, 100, 1, "%"), ...responsive("Glow brightens contour edges.") },
            cold: { type: "color", target: "heatmap.cold", label: "Cold", defaultValue: "#251377" },
            hot: { type: "color", target: "heatmap.hot", label: "Hot", defaultValue: "#FF493D" },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["cold", "hot"] }],
        },
        {
          title: "Liquid Metal",
          visibleWhen: { target: "effect.mode", equals: "liquid-metal" },
          controls: {
            flow: { ...slider("metal.flow", "Flow", 62, 0, 100, 1, "%"), ...responsive("Flow changes reflective band movement.") },
            reflectivity: { ...slider("metal.reflectivity", "Reflectivity", 82, 0, 100, 1, "%"), ...responsive("Reflectivity changes view-dependent highlights.") },
            roughness: { ...slider("metal.roughness", "Roughness", 22, 0, 100, 1, "%"), ...responsive("Roughness broadens reflections.") },
            tint: { type: "color", target: "metal.tint", label: "Tint", defaultValue: "#D8E5E6" },
            shadow: { type: "color", target: "metal.shadow", label: "Shadow", defaultValue: "#15233F" },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["tint", "shadow"] }],
        },
        {
          title: "Gem Smoke",
          visibleWhen: { target: "effect.mode", equals: "gem-smoke" },
          controls: {
            smoke: { ...slider("gem.smoke", "Smoke density", 56, 0, 100, 1, "%"), ...responsive("Density changes the layered noise field.") },
            iridescence: { ...slider("gem.iridescence", "Iridescence", 78, 0, 100, 1, "%"), ...responsive("Iridescence changes spectral color mixing.") },
            bloom: { ...slider("gem.bloom", "Bloom", 48, 0, 100, 1, "%"), ...responsive("Bloom brightens edge refraction.") },
            inner: { type: "color", target: "gem.inner", label: "Inner", defaultValue: "#D9FF58" },
            outer: { type: "color", target: "gem.outer", label: "Outer", defaultValue: "#8A45FF" },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["inner", "outer"] }],
        },
        {
          title: "Rotation",
          controls: {
            autoRotate: { type: "switch", target: "motion.autoRotate", label: "Auto rotate", defaultValue: true, ...responsive("Auto rotation updates one group transform.") },
            animateMaterial: { type: "switch", target: "motion.animateMaterial", label: "Animate material", defaultValue: false, ...responsive("Material animation advances shader time only when enabled.") },
            speed: { ...slider("motion.speed", "Speed", 42, 0, 100, 1, "%"), ...responsive("Speed changes the rotation increment.") },
            previewFps: { type: "select", target: "performance.fps", label: "Preview FPS", defaultValue: "30", options: [{ label: "30 FPS", value: "30" }, { label: "60 FPS", value: "60" }], performanceRole: "workload", performanceReason: "Preview FPS controls how often the Three.js scene is rendered." },
            antialias: { type: "switch", target: "performance.antialias", label: "Antialiasing", defaultValue: false, performanceRole: "workload", performanceReason: "MSAA increases fragment and memory cost." },
            viewActions: { type: "actions", target: "actions.view", label: "View", actions: [{ icon: "rotate-ccw", label: "Reset rotation", value: "view.reset" }] },
          },
        },
        {
          title: "Scene",
          controls: {
            background: { type: "color", target: "scene.background", label: "Background", defaultValue: "#101014" },
            ground: { type: "switch", target: "scene.ground", label: "Ground shadow", defaultValue: true },
          },
        },
        {
          title: "Export settings",
          controls: {
            imageResolution: { type: "select", target: "export.image.resolution", label: "Resolution", defaultValue: "2k", options: [{ label: "Current", value: "current" }, { label: "2K", value: "2k" }, { label: "4K", value: "4k" }, { label: "8K", value: "8k" }], performanceRole: "workload", performanceReason: "Resolution controls exported pixel count." },
            videoResolution: { type: "select", target: "export.video.resolution", label: "Video", defaultValue: "current", options: [{ label: "Current", value: "current" }, { label: "4K", value: "4k" }], performanceRole: "workload", performanceReason: "Video resolution controls recording canvas size." },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["imageResolution", "videoResolution"] }],
        },
        {
          title: "Export",
          actionGroup: "secondary",
          controls: {
            outputActions: { type: "artistic3DExport", target: "actions.output", label: false, defaultValue: null },
          },
        },
      ],
    },
  },
  persistence: { storage: "localStorage", key: "toolcraft:artistic-3d:state:v2", version: 2, include: ["values", "media", "canvas", "panels"] },
  settingsTransfer: { enabled: true, appId: "artistic-3d", fileName: "artistic-3d-settings" },
  toolbar: { back: { href: "/", label: "Back to tools" }, history: true, radar: true, theme: true, zoom: true },
});
