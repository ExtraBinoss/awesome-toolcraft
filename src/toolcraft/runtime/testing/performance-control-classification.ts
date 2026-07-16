import type {
  ResolvedToolcraftAppSchema,
  ToolcraftControlSchema,
} from "../schema/types";
import { isToolcraftRuntimeOwnedTarget } from "../schema/runtime-targets";
import type {
  ToolcraftPerformanceSensitiveControl,
  ToolcraftUnclassifiedPerformanceControl,
} from "./performance-types";

const workloadControlPattern =
  /char\s*size|cell|density|glyph|grid|iteration|matrix|particle|quality|radius|resolution|sample|scale|size/i;

const heavyTextInputPattern = /code|css|instruction|json|prompt|script|shader|template/i;

function getControlSemanticText(control: ToolcraftControlSchema): string {
  return [
    control.target,
    typeof control.label === "string" ? control.label : "",
    control.unit ?? "",
    control.valueLabel ?? "",
    control.xLabel ?? "",
    control.yLabel ?? "",
    ...(control.options ?? []).flatMap((option) => [option.label, option.value]),
  ].join(" ");
}

export function isSemanticallyHeavyTextControl(control: ToolcraftControlSchema): boolean {
  return heavyTextInputPattern.test(getControlSemanticText(control));
}

function isSemanticallyWorkloadControl(control: ToolcraftControlSchema): boolean {
  const semanticText = getControlSemanticText(control);

  if (control.type === "code" || control.type === "text") {
    return isSemanticallyHeavyTextControl(control);
  }

  return workloadControlPattern.test(semanticText);
}

function isPotentialWorkloadControl(control: ToolcraftControlSchema): boolean {
  return control.performanceRole === "workload" || isSemanticallyWorkloadControl(control);
}

export function collectToolcraftPerformanceSensitiveControls(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftPerformanceSensitiveControl[] {
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls)
      .filter(
        ([, control]) =>
          !isToolcraftRuntimeOwnedTarget(control.target) && isPotentialWorkloadControl(control),
      )
      .map(([controlId, control]) => ({
        control,
        controlId,
        target: control.target,
      })),
  );
}

export function collectToolcraftPerformanceRoleConflicts(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftPerformanceSensitiveControl[] {
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls)
      .filter(
        ([, control]) =>
          !isToolcraftRuntimeOwnedTarget(control.target) &&
          control.performanceRole === "responsiveness" &&
          isSemanticallyWorkloadControl(control),
      )
      .map(([controlId, control]) => ({
        control,
        controlId,
        target: control.target,
      })),
  );
}

export function collectToolcraftUnclassifiedPerformanceControls(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftUnclassifiedPerformanceControl[] {
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls)
      .filter(
        ([, control]) =>
          control.type !== "panelActions" &&
          control.type !== "settingsTransfer" &&
          !isToolcraftRuntimeOwnedTarget(control.target) &&
          control.performanceRole !== "workload" &&
          control.performanceRole !== "responsiveness",
      )
      .map(([controlId, control]) => ({
        control,
        controlId,
        target: control.target,
      })),
  );
}
