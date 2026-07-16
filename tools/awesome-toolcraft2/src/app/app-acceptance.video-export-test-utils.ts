import type { ResolvedToolcraftAppSchema } from "@/toolcraft/runtime";

import type { ToolcraftTransferMode } from "./acceptance/types";

export function schemaRequiresVideoExport(
  schema: ResolvedToolcraftAppSchema,
  transferMode: ToolcraftTransferMode,
): boolean {
  if (schema.panels.timeline?.enabled) {
    return true;
  }

  if (
    transferMode.animationIntent?.mode === "timeline-keyframes" ||
    transferMode.animationIntent?.mode === "timeline-playback"
  ) {
    return true;
  }

  if (transferMode.mode !== "reference-runtime-clone") {
    return false;
  }

  if (transferMode.referenceTimeline.mode !== "none") {
    return true;
  }

  return transferMode.behaviorCoverage.some((coverage) =>
    [
      "renderer-loop",
      "pause-resume",
      "restart",
      "time-progress",
      "export-at-time",
    ].includes(coverage),
  );
}
