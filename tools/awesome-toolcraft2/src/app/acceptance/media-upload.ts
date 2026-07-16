import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import type { ToolcraftComponentAcceptance } from "./types";

export function getFileDropLifecycleCoverageErrors(
  label: string,
  control: ToolcraftControlSchema,
  entry: ToolcraftComponentAcceptance,
  hasDefaultMediaAssets: boolean,
): string[] {
  const errors: string[] = [];
  const coverage = new Set(entry.mediaLifecycleCoverage ?? []);

  if (entry.evidence !== "media-lifecycle") {
    errors.push(
      `${label} fileDrop acceptance evidence must be "media-lifecycle" so upload, clear, and reset behavior cannot be replaced by generic product-output coverage.`,
    );
  }

  if (!coverage.has("upload") || !coverage.has("remove") || !coverage.has("reset")) {
    errors.push(
      `${label} fileDrop acceptance must prove upload/import, clear/remove, and section or global reset restore default source media or remove uploaded source media when no default exists.`,
    );
  }

  if (hasDefaultMediaAssets) {
    if (!coverage.has("default-remove") || !coverage.has("default-reset")) {
      errors.push(
        `${label} fileDrop acceptance must prove predefined media.defaultAssets render as attached files, can be removed to an empty source/canvas state, and are restored by section or global Reset.`,
      );
    }
  }

  if (control.assetKind !== "file") {
    if (
      !coverage.has("rotate") ||
      !coverage.has("flip") ||
      !coverage.has("transform-output")
    ) {
      errors.push(
        `${label} image fileDrop acceptance must prove rotate and flip actions update runtime media transform metadata and that preview, renderer, or export consumes the transform.`,
      );
    }
  }

  if (control.multiple === true) {
    if (!coverage.has("reorder") || !coverage.has("order-output")) {
      errors.push(
        `${label} multiple fileDrop acceptance must prove thumbnail/file reorder updates runtime media order and that preview, renderer, or export consumes that order.`,
      );
    }
  }

  return errors;
}
