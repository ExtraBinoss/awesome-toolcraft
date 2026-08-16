"use client";

import { useColorPickerController } from "./style-guide-color-picker-controller";
import { ColorPickerView } from "./style-guide-color-picker-view";
import type { StyleGuideColorPickerProps } from "./style-guide-color-picker-types";

export function StyleGuideColorPicker(props: StyleGuideColorPickerProps) {
  return <ColorPickerView {...useColorPickerController(props)} />;
}
