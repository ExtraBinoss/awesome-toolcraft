import type { ToolcraftOutputExportFacts } from "./output-export-model";

export function getToolcraftOutputExportLayoutErrors(
  facts: ToolcraftOutputExportFacts,
): string[] {
  const errors: string[] = [];

  if (!facts.backgroundSection) {
    errors.push(
      'Product apps with Export PNG must expose a separate controls section titled "Background" directly before the first export settings section.',
    );
  }

  if (
    facts.backgroundSectionIndex >= 0 &&
    facts.expectedOutputSettingsIndex >= 0 &&
    facts.backgroundSectionIndex !== facts.expectedOutputSettingsIndex - 1
  ) {
    errors.push(
      'The "Background" controls section must sit directly before the first export settings section: Image Export when PNG export exists, otherwise Video Export.',
    );
  }

  if (
    facts.finalExportSettingsIndex >= 0 &&
    facts.panelActionsSectionIndex >= 0 &&
    facts.finalExportSettingsIndex !== facts.panelActionsSectionIndex - 1
  ) {
    errors.push(
      'Export settings must sit directly above sticky footer actions: Image Export for still apps, or Video Export after Image Export for animated apps.',
    );
  }

  if (
    facts.hasVideoExportAction &&
    facts.imageExportSectionIndex >= 0 &&
    facts.videoExportSectionIndex >= 0 &&
    facts.imageExportSectionIndex !== facts.videoExportSectionIndex - 1
  ) {
    errors.push(
      'Animated apps with both Export PNG and Export Video must place Image Export immediately before Video Export.',
    );
  }

  return errors;
}
