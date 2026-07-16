import type { ToolcraftControlSchema } from "../../../schema/types";
import { asFontPickerValue } from "./controls-panel-font-values";
import { asNumber } from "./controls-panel-value-primitives";

export function asCollectionItems(value: unknown, fallback: unknown): unknown[] {
  if (Array.isArray(value)) {
    return [...value];
  }

  return Array.isArray(fallback) ? [...fallback] : [];
}

export function getCollectionMinItems(control: ToolcraftControlSchema): number {
  return Math.max(0, Math.floor(asNumber(control.minItems, 0)));
}

export function getCollectionHardMaxItems(
  control: ToolcraftControlSchema,
): number | null {
  if (typeof control.hardMaxItems !== "number" || !Number.isFinite(control.hardMaxItems)) {
    return null;
  }

  return Math.max(0, Math.floor(control.hardMaxItems));
}

export function getCollectionItemType(control: ToolcraftControlSchema): string {
  return control.itemControl?.type ?? "color";
}

export function getCollectionItemBaseLabel(control: ToolcraftControlSchema): string {
  if (control.itemLabel) {
    return control.itemLabel;
  }

  const label = control.itemControl?.label;

  return typeof label === "string" ? label : "Item";
}

export function getCollectionItemName(
  control: ToolcraftControlSchema,
  index: number,
): string {
  const label = control.itemControl?.label;

  if (label === false) {
    return "";
  }

  return `${getCollectionItemBaseLabel(control)} ${index + 1}`;
}

export function getCollectionItemDefaultValue(
  control: ToolcraftControlSchema,
): unknown {
  if ("itemDefaultValue" in control) {
    return control.itemDefaultValue;
  }

  if (typeof control.itemControl?.defaultValue !== "undefined") {
    return control.itemControl.defaultValue;
  }

  switch (getCollectionItemType(control)) {
    case "color":
      return { hex: "#C1FF00" };
    case "colorOpacity":
      return { hex: "#C1FF00", opacity: 100 };
    case "fontPicker":
      return asFontPickerValue(control.itemControl?.defaultValue);
    case "checkbox":
    case "switch":
      return false;
    case "rangeInput":
      return { end: "100%", start: "0%" };
    case "select":
    case "segmented":
      return control.itemControl?.options?.[0]?.value ?? "";
    case "slider":
      return control.itemControl?.min ?? 0;
    case "text":
      return "";
    default:
      return "";
  }
}
