import type { ToolcraftComponentAcceptance } from "./types";

const commandTargets = new Set([
  "canvas.center",
  "canvas.setOffset",
  "canvas.setSize",
  "canvas.setViewport",
  "canvas.zoomIn",
  "canvas.zoomOut",
  "controls.setValue",
  "history.redo",
  "history.undo",
]);

export function getToolcraftCanvasHandleAcceptanceErrors({
  acceptance,
  controlTargets,
}: {
  acceptance: readonly ToolcraftComponentAcceptance[];
  controlTargets: ReadonlySet<string>;
}): string[] {
  const errors: string[] = [];

  for (const entry of acceptance) {
    if (entry.kind !== "canvas-handle") {
      continue;
    }

    if (!entry.canvasHandle) {
      errors.push(`${entry.id} canvas handle is missing canvasHandle metadata.`);
      continue;
    }

    if (!entry.canvasHandle.testId.trim()) {
      errors.push(`${entry.id} canvas handle must provide a stable testId.`);
    }

    if (!entry.canvasHandle.writesTarget.trim()) {
      errors.push(`${entry.id} canvas handle must name the runtime target it writes.`);
    }

    if (
      entry.canvasHandle.writesTarget &&
      !controlTargets.has(entry.canvasHandle.writesTarget) &&
      !commandTargets.has(entry.canvasHandle.writesTarget)
    ) {
      errors.push(
        `${entry.id} canvas handle writesTarget ${entry.canvasHandle.writesTarget} does not match a schema target or supported editor command.`,
      );
    }

    if (!entry.canvasHandle.outputObservable.trim()) {
      errors.push(`${entry.id} canvas handle must describe the product output change.`);
    }

    if (!entry.canvasHandle.exportCleanTestName.trim()) {
      errors.push(`${entry.id} canvas handle must point to an export-clean test.`);
    }

    if (!entry.browser || !entry.browserTestName.trim()) {
      errors.push(`${entry.id} canvas handle must have browser drag coverage.`);
    }

    if (!entry.automated || !entry.automatedTestName.trim()) {
      errors.push(`${entry.id} canvas handle must have automated output coverage.`);
    }
  }

  return errors;
}
