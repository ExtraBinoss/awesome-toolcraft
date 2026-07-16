import type {
  ResolvedToolcraftAppSchema,
  ToolcraftActionSchema,
} from "@/toolcraft/runtime";

import { getControlActions } from "./actions";

function actionLooksLikePngExport(action: ToolcraftActionSchema | string): boolean {
  return typeof action !== "string" && action.role === "export-image";
}

function actionLooksLikeVideoExport(action: ToolcraftActionSchema | string): boolean {
  return typeof action !== "string" && action.role === "export-video";
}

export function schemaHasPngExportPanelAction(schema: ResolvedToolcraftAppSchema): boolean {
  return (schema.panels.controls?.sections ?? []).some((section) =>
    Object.values(section.controls).some(
      (control) =>
        control.type === "panelActions" &&
        getControlActions(control).some(actionLooksLikePngExport),
    ),
  );
}

export function schemaHasVideoExportPanelAction(schema: ResolvedToolcraftAppSchema): boolean {
  return (schema.panels.controls?.sections ?? []).some((section) =>
    Object.values(section.controls).some(
      (control) =>
        control.type === "panelActions" &&
        getControlActions(control).some(actionLooksLikeVideoExport),
    ),
  );
}
