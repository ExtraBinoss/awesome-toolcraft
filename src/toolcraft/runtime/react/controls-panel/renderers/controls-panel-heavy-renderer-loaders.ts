let fontPickerModule: Promise<
  typeof import("@/toolcraft/ui/components/controls/font-picker/font-picker-control")
> | undefined;
let curvesModule: Promise<
  typeof import("@/toolcraft/ui/components/controls/curves/curves-control")
> | undefined;
let gradientModule: Promise<
  typeof import("@/toolcraft/ui/components/controls/gradient/gradient-control")
> | undefined;

export function loadFontPickerRenderer() {
  fontPickerModule ??= import("@/toolcraft/ui/components/controls/font-picker/font-picker-control");
  return fontPickerModule;
}

export function loadCurvesRenderer() {
  curvesModule ??= import("@/toolcraft/ui/components/controls/curves/curves-control");
  return curvesModule;
}

export function loadGradientRenderer() {
  gradientModule ??= import("@/toolcraft/ui/components/controls/gradient/gradient-control");
  return gradientModule;
}

export function preloadCompoundControlRenderers(controlTypes: ReadonlySet<string>): Promise<unknown[]> {
  const imports: Promise<unknown>[] = [];
  if (controlTypes.has("fontPicker")) imports.push(loadFontPickerRenderer());
  if (controlTypes.has("curves")) imports.push(loadCurvesRenderer());
  if (controlTypes.has("gradient")) imports.push(loadGradientRenderer());
  return Promise.all(imports);
}
