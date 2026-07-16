import type { ToolcraftControlSchema } from "../../../schema/types";
import { asCanvasAspectRatioValue } from "./controls-panel-aspect-ratio-values";
import { asCollectionItems } from "./controls-panel-collection-values";
import {
  asColorOpacityValue,
  asColorValue,
  asGradientValue,
} from "./controls-panel-color-values";
import { asFontPickerValue } from "./controls-panel-font-values";
import { asRangeInputValue, asVectorValue } from "./controls-panel-spatial-values";
import {
  asBoolean,
  asNumber,
  asNumberArray,
  asString,
  isRecord,
} from "./controls-panel-value-primitives";

export function formatControlValueLabel(
  control: ToolcraftControlSchema,
  value: unknown,
): string {
  if (typeof control.valueLabel === "string") {
    return control.valueLabel;
  }

  switch (control.type) {
    case "aspectRatio":
      return asCanvasAspectRatioValue(value, control.defaultValue).value;
    case "checkbox":
    case "switch":
      return asBoolean(value) ? "On" : "Off";
    case "color":
      return asColorValue(value).hex;
    case "colorOpacity": {
      const colorOpacityValue = asColorOpacityValue(value);

      return `${colorOpacityValue.hex} ${colorOpacityValue.opacity}%`;
    }
    case "collectionActions":
      return `${asCollectionItems(value, control.defaultValue).length} items`;
    case "fontPicker":
      return asFontPickerValue(value).fontId;
    case "gradient":
      return `${asGradientValue(value).stops.length} stops`;
    case "imagePicker":
      return (
        control.items?.find((item) => item.value === value)?.alt ??
        asString(value)
      );
    case "palette": {
      if (isRecord(value)) {
        const family = asString(value.family);
        const shade = asString(value.shade);

        return [family, shade].filter(Boolean).join(" ") || "Palette";
      }

      return "Palette";
    }
    case "rangeInput": {
      const rangeValue = asRangeInputValue(value);

      return `${rangeValue.start} – ${rangeValue.end}`;
    }
    case "rangeSlider": {
      const rangeValue = asNumberArray(value, []);

      return rangeValue.length > 0
        ? rangeValue.map((item) => `${item}${control.unit ?? ""}`).join(" – ")
        : "Range";
    }
    case "select":
    case "segmented":
      return (
        control.options?.find((option) => option.value === value)?.label ??
        asString(value)
      );
    case "slider":
      return `${asNumber(value, asNumber(control.defaultValue, control.min ?? 0))}${
        control.unit ?? ""
      }`;
    case "vector": {
      const vectorValue = asVectorValue(value);

      return `${vectorValue.x}, ${vectorValue.y}`;
    }
    default:
      return typeof value === "string" || typeof value === "number"
        ? String(value)
        : control.type;
  }
}
