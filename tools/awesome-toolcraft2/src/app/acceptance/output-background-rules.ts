import { getControlLabelText } from "./controls";
import {
  getSearchableControlText,
  type ToolcraftControlsSection,
  type ToolcraftOutputExportFacts,
} from "./output-export-model";
import type { ToolcraftVisibleControl } from "./types";

function schemaHasOutputBackgroundColorControl(
  controls: readonly ToolcraftVisibleControl[],
): boolean {
  return controls.some((visibleControl) => {
    const { control } = visibleControl;

    if (control.type !== "color") {
      return false;
    }

    return /\b(background|backdrop|scene|canvas)\b/i.test(
      getSearchableControlText(visibleControl),
    );
  });
}

function schemaHasOutputBackgroundToggleControl(
  controls: readonly ToolcraftVisibleControl[],
): boolean {
  return controls.some(isOutputBackgroundToggleControl);
}

export function isOutputBackgroundToggleControl(
  visibleControl: ToolcraftVisibleControl,
): boolean {
  const { control } = visibleControl;

  if (
    control.type !== "switch" &&
    control.type !== "checkbox" &&
    control.type !== "select" &&
    control.type !== "segmented"
  ) {
    return false;
  }

  return /\b(background|backdrop|transparent|transparency|alpha)\b/i.test(
    getSearchableControlText(visibleControl),
  );
}

function sectionHasEqualWidthOutputBackgroundRow(
  section: ToolcraftControlsSection | undefined,
  toggleControlId: string | undefined,
  colorControlId: string | undefined,
): boolean {
  if (!section || !toggleControlId || !colorControlId) {
    return false;
  }

  return (section.layoutGroups ?? []).some(
    (layoutGroup) =>
      layoutGroup.layout === "inline" &&
      layoutGroup.columns === 2 &&
      layoutGroup.controls.length === 2 &&
      layoutGroup.controls[0] === toggleControlId &&
      layoutGroup.controls[1] === colorControlId,
  );
}

export function getToolcraftOutputBackgroundErrors({
  controls,
  facts,
}: {
  controls: readonly ToolcraftVisibleControl[];
  facts: ToolcraftOutputExportFacts;
}): string[] {
  const errors: string[] = [];

  if (!schemaHasOutputBackgroundColorControl(controls)) {
    errors.push(
      "Product apps with Export PNG must expose a user-facing background color control such as appearance.background or scene.background. Preview, PNG export, and video export must read that runtime value instead of hardcoding the product background.",
    );
  }

  if (!facts.backgroundColorEntry) {
    errors.push(
      'The "Background" section must contain the renderer-owned background color control, such as appearance.background or scene.background.',
    );
  } else {
    const [, backgroundColorControl] = facts.backgroundColorEntry;

    if (backgroundColorControl.label !== false) {
      errors.push(
        'The background color control inside the required "Background" section must use label false; the section title already supplies the visible context.',
      );
    }
  }

  if (!schemaHasOutputBackgroundToggleControl(controls)) {
    errors.push(
      'Product apps with Export PNG must expose export.includeBackground inside the required "Background" section as a Switch labeled "Include". PNG export must pass that runtime value to createToolcraftPngExportCanvas includeBackground; live preview must use shouldIncludeToolcraftPreviewBackground(state); video export keeps the background.',
    );
  }

  if (!facts.includeBackgroundEntry) {
    errors.push(
      'The "Background" section must contain export.includeBackground as the Include switch.',
    );
  } else {
    const [, includeBackgroundControl] = facts.includeBackgroundEntry;

    if (includeBackgroundControl.type !== "switch") {
      errors.push('export.includeBackground must be a Switch control labeled "Include".');
    }

    if (getControlLabelText(includeBackgroundControl) !== "Include") {
      errors.push(
        'export.includeBackground must use the short visible label "Include"; the Background section title already supplies the rest of the context.',
      );
    }
  }

  if (
    !sectionHasEqualWidthOutputBackgroundRow(
      facts.backgroundSection,
      facts.includeBackgroundEntry?.[0],
      facts.backgroundColorEntry?.[0],
    )
  ) {
    errors.push(
      'The "Background" section must render export.includeBackground and the background color in one two-column inline layoutGroup, with Include on the left and the unlabeled background color on the right.',
    );
  }

  return errors;
}
