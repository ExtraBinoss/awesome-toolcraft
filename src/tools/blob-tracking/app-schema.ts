import { defineToolcraft } from "@/toolcraft/runtime/schema/define-toolcraft";

const slider = (target: string, label: string, defaultValue: number, min: number, max: number, step = 1) => ({ type: "slider", target, label, defaultValue, min, max, step, sliderValueKind: step < 1 ? "continuous" : "discrete" } as const);

export const appSchema = defineToolcraft({
  canvas: { enabled: true, draggable: false, size: { width: 1280, height: 720, unit: "px" }, sizing: { mode: "fixed-output" }, upload: false },
  export: { png: { background: "transparent" } },
  media: { defaultAssets: [
    { id: "library-gnou", assetKind: "image", dataUrl: "/baseAssets/images/gnou.jpg", fileName: "gnou.jpg", mimeType: "image/jpeg" },
    { id: "library-clione", assetKind: "image", dataUrl: "/baseAssets/images/Clione.jpg", fileName: "Clione.jpg", mimeType: "image/jpeg" },
    { id: "library-papillon", assetKind: "image", dataUrl: "/baseAssets/images/papillon_monarque.jpg", fileName: "papillon_monarque.jpg", mimeType: "image/jpeg" },
    { id: "library-jellyfish", assetKind: "file", dataUrl: "/baseAssets/videos/jellyfish.webm", fileName: "jellyfish.webm", mimeType: "video/webm" },
    { id: "library-cat-candle", assetKind: "file", dataUrl: "/baseAssets/videos/cat_candle.webm", fileName: "cat_candle.webm", mimeType: "video/webm" },
    { id: "library-pinguin", assetKind: "file", dataUrl: "/baseAssets/videos/pinguin.webm", fileName: "pinguin.webm", mimeType: "video/webm" },
  ] },
  panels: { controls: { title: "Blob Tracking", sections: [
    { title: "Source", controls: { source: { type: "assetLibrary", target: "blob.source", label: false, defaultValue: { assetId: "jellyfish", kind: "library", mediaType: "video" } } } },
    { title: "Mask", controls: {
      view: { type: "select", target: "blob.view", label: "View", defaultValue: "final", options: [{ label: "Final", value: "final" }, { label: "Source", value: "source" }, { label: "Edges", value: "edge" }, { label: "Blurred", value: "blurred" }, { label: "Mask", value: "mask" }] },
      maskMode: { type: "select", target: "blob.maskMode", label: "Mode", defaultValue: "luma", options: [{ label: "Luma", value: "luma" }, { label: "Dark", value: "dark" }, { label: "Key", value: "key" }, { label: "Background", value: "background" }] },
      keyColor: { type: "color", target: "blob.keyColor", label: "Key color", defaultValue: "#ff3355" },
      threshold: slider("blob.threshold", "Threshold", .5, 0, 1, .01),
      softness: slider("blob.softness", "Softness", .045, 0, .5, .005),
      blur: slider("blob.blur", "Blur", 1, 0, 8),
      keyTolerance: slider("blob.keyTolerance", "Key tolerance", .32, .01, 1, .01),
      backgroundGain: slider("blob.backgroundGain", "Background gain", 3, 0, 8, .1),
    } },
    { title: "Detection", controls: {
      edgeSource: { type: "select", target: "blob.edgeSource", label: "Edge source", defaultValue: "mask", options: [{ label: "Mask", value: "mask" }, { label: "Luma", value: "luma" }] },
      edgeAmount: slider("blob.edgeAmount", "Edge amount", .12, 0, 1, .01), edgeGain: slider("blob.edgeGain", "Edge gain", 4, 0, 10, .1),
      minArea: slider("blob.minArea", "Min area", 10, 1, 1000), maxArea: slider("blob.maxArea", "Max area", 1800, 10, 57600), maxBlobs: slider("blob.maxBlobs", "Max blobs", 50, 1, 100), readEvery: slider("blob.readEvery", "CPU read every", 2, 1, 12),
      resolutionScale: slider("blob.resolutionScale", "Resolution scale", 1, .25, 1, .25),
    } },
    { title: "Tracking", controls: {
      motionSmoothing: slider("blob.motionSmoothing", "Motion smoothing", .35, 0, 1, .01), matchDistance: slider("blob.matchDistance", "Match distance", 70, 1, 300),
    } },
    { title: "Overlay", controls: {
      outlineColor: { type: "color", target: "blob.outlineColor", label: "Outline", defaultValue: "#ffffff" }, trailColor: { type: "color", target: "blob.trailColor", label: "Trail", defaultValue: "#ff3355" },
      thickness: slider("blob.thickness", "Thickness", 2, 1, 12), lineDistance: slider("blob.lineDistance", "Line distance", 90, 1, 400), curve: slider("blob.curve", "Curve", .12, 0, .5, .01),
      brackets: { type: "switch", target: "blob.brackets", label: "Brackets", defaultValue: true }, connections: { type: "switch", target: "blob.connections", label: "Connections", defaultValue: true }, trails: { type: "switch", target: "blob.trails", label: "Trails", defaultValue: true }, centerDots: { type: "switch", target: "blob.centerDots", label: "Center dots", defaultValue: true }, showIds: { type: "switch", target: "blob.showIds", label: "IDs", defaultValue: false }, showMetrics: { type: "switch", target: "blob.showMetrics", label: "Metrics", defaultValue: false },
      mix: slider("blob.mix", "Mix", 1, 0, 1, .01),
    } },
    { title: "Background", controls: { includeBackground: { type: "switch", target: "export.includeBackground", label: "Include", defaultValue: true }, background: { type: "color", target: "blob.background", label: false, defaultValue: "#050505" } }, layoutGroups: [{ layout: "inline", columns: 2, controls: ["includeBackground", "background"] }] },
    { title: "Image Export", controls: { imageFormat: { type: "select", target: "export.image.format", label: "Format", defaultValue: "png", options: [{ label: "PNG", value: "png" }, { label: "JPG", value: "jpg" }] }, imageResolution: { type: "select", target: "export.image.resolution", label: "Resolution", defaultValue: "4k", options: [{ label: "2K", value: "2k" }, { label: "4K", value: "4k" }, { label: "8K", value: "8k" }] }, videoResolution: { type: "select", target: "export.video.resolution", label: "Video size", defaultValue: "current", options: [{ label: "Current", value: "current" }, { label: "4K", value: "4k" }] } }, layoutGroups: [{ layout: "inline", columns: 2, controls: ["imageFormat", "imageResolution"] }] },
    { title: "Export", actionGroup: "secondary", controls: { export: { type: "blobExport", target: "blob.export", label: false, defaultValue: null } } },
  ] }, timeline: { mode: "playback", defaultDurationSeconds: 12 } }, persistence: { storage: "localStorage", key: "toolcraft:blob-tracking:state:v1", version: 1, include: ["values", "media", "canvas", "panels"] }, settingsTransfer: { enabled: true, appId: "blob-tracking", fileName: "blob-tracking-settings" }, toolbar: { back: { href: "/", label: "Back to tools" }, history: true, radar: true, theme: true, zoom: true },
});
