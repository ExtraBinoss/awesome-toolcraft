export type ToolcraftRuntimeSectionLayout = "grouped" | "standalone";

export const TOOLCRAFT_BUILT_IN_CONTROL_TYPES = [
  "actions",
  "anchorGrid",
  "aspectRatio",
  "channelMixer",
  "checkbox",
  "code",
  "collectionActions",
  "color",
  "colorOpacity",
  "curves",
  "fileDrop",
  "fontPicker",
  "gradient",
  "imagePicker",
  "palette",
  "panelActions",
  "rangeInput",
  "rangeSlider",
  "segmented",
  "select",
  "settingsTransfer",
  "slider",
  "switch",
  "text",
  "vector",
] as const;

export type ToolcraftBuiltInControlType =
  (typeof TOOLCRAFT_BUILT_IN_CONTROL_TYPES)[number];

export const TOOLCRAFT_CONTROL_DEFAULT_SECTION_LAYOUT: Record<
  string,
  ToolcraftRuntimeSectionLayout
> = {
  actions: "grouped",
  anchorGrid: "standalone",
  aspectRatio: "grouped",
  channelMixer: "standalone",
  checkbox: "grouped",
  code: "standalone",
  collectionActions: "standalone",
  color: "standalone",
  colorOpacity: "standalone",
  curves: "standalone",
  fileDrop: "standalone",
  fontPicker: "standalone",
  gradient: "standalone",
  imagePicker: "standalone",
  palette: "standalone",
  panelActions: "standalone",
  rangeInput: "grouped",
  rangeSlider: "grouped",
  segmented: "grouped",
  select: "grouped",
  settingsTransfer: "standalone",
  slider: "grouped",
  switch: "grouped",
  text: "grouped",
  vector: "standalone",
};

export const TOOLCRAFT_RUNTIME_PANEL_METADATA = {
  controlsPanel: {
    capabilities: ["dragMode:handle"],
    defaultPlacement: "right",
    snapEdges: ["left", "right"],
    visualComponent: "ControlsPanel",
  },
  layersPanel: {
    capabilities: ["dragMode:handle"],
    defaultPlacement: "left",
    snapEdges: ["left", "right"],
    visualComponent: "LayersPanel",
  },
  timelinePanel: {
    capabilities: ["dragMode:panel"],
    defaultPlacement: "top",
    snapEdges: ["top", "bottom"],
    visualComponent: "TimelinePanel",
  },
  toolbar: {
    capabilities: ["dragMode:panel"],
    defaultPlacement: "bottom",
    snapEdges: ["top", "bottom"],
    visualComponent: "ToolbarPanel",
  },
} as const;
