import type { HsvColor } from "../../../lib/style-guide-color-utils";
import { getColorChannels, type ColorSurfaceModel } from "./style-guide-color-picker-channel-utils";

const HUE_RAIL_BACKGROUND =
  "linear-gradient(90deg, #ff0000 0%, #ffff00 16.67%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.67%, #ff00ff 83.33%, #ff0000 100%)";
const RGB_BLUE_RAIL_BACKGROUND = "linear-gradient(90deg, rgb(0 0 0), rgb(0 0 255))";

export function getColorSurfaceSliderConfig({
  colorModel,
  currentColorHex,
  hueLabel,
  optimisticColor,
}: {
  colorModel: ColorSurfaceModel;
  currentColorHex: string;
  hueLabel: string;
  optimisticColor: HsvColor;
}): { label: string; max: number; railBackground: string; value: number } {
  if (colorModel === "rgb") {
    const [, , blue] = getColorChannels(currentColorHex).rgb;
    return {
      label: "RGB blue channel",
      max: 255,
      railBackground: RGB_BLUE_RAIL_BACKGROUND,
      value: blue,
    };
  }
  return {
    label: hueLabel,
    max: 360,
    railBackground: HUE_RAIL_BACKGROUND,
    value: optimisticColor.h,
  };
}
