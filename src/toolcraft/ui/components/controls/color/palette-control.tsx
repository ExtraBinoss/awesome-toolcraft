"use client";

import type {
  PaletteColorFamily,
  PaletteControlValue,
  PaletteShadeStep,
} from "./palette-control-data";
import { usePaletteControlController } from "./palette-control-controller";
import { PaletteControlView } from "./palette-control-view";
import type { PaletteControlProps } from "./palette-control-types";

export type { PaletteColorFamily, PaletteControlValue, PaletteShadeStep };
export type { PaletteControlChangeMeta, PaletteControlProps } from "./palette-control-types";

export function PaletteControl(props: PaletteControlProps) {
  return <PaletteControlView {...usePaletteControlController(props)} />;
}
