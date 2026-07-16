import {
  TOOLCRAFT_BUILT_IN_CONTROL_TYPES,
  type ToolcraftBuiltInControlType,
} from "../../../contracts/component-contracts";

export type ToolcraftControlRendererKind =
  | "action"
  | "basic"
  | "collection"
  | "compound"
  | "media"
  | "settings";

export const TOOLCRAFT_CONTROL_RENDERER_REGISTRY = {
  actions: "action",
  anchorGrid: "basic",
  aspectRatio: "basic",
  channelMixer: "compound",
  checkbox: "basic",
  code: "basic",
  collectionActions: "collection",
  color: "compound",
  colorOpacity: "compound",
  curves: "compound",
  fileDrop: "media",
  fontPicker: "compound",
  gradient: "compound",
  imagePicker: "compound",
  palette: "compound",
  panelActions: "action",
  rangeInput: "basic",
  rangeSlider: "basic",
  segmented: "basic",
  select: "basic",
  settingsTransfer: "settings",
  slider: "basic",
  switch: "basic",
  text: "basic",
  vector: "basic",
} as const satisfies Record<
  ToolcraftBuiltInControlType,
  ToolcraftControlRendererKind
>;

export function getToolcraftControlRendererKind(
  controlType: string,
): ToolcraftControlRendererKind | null {
  return TOOLCRAFT_BUILT_IN_CONTROL_TYPES.includes(
    controlType as ToolcraftBuiltInControlType,
  )
    ? TOOLCRAFT_CONTROL_RENDERER_REGISTRY[
        controlType as ToolcraftBuiltInControlType
      ]
    : null;
}
