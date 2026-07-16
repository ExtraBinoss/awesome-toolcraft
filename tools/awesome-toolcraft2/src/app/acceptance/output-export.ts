import type { ResolvedToolcraftAppSchema } from "@/toolcraft/runtime";

import {
  getToolcraftOutputBackgroundErrors,
  isOutputBackgroundToggleControl,
} from "./output-background-rules";
import {
  schemaHasPngExportPanelAction,
  schemaHasVideoExportPanelAction,
} from "./output-export-actions";
import { getToolcraftOutputExportLayoutErrors } from "./output-export-layout-rules";
import { buildToolcraftOutputExportFacts } from "./output-export-model";
import { getToolcraftImageExportErrors } from "./output-image-export-rules";
import type { ToolcraftVisibleControl } from "./types";

export {
  isOutputBackgroundToggleControl,
  schemaHasPngExportPanelAction,
  schemaHasVideoExportPanelAction,
};

export function getToolcraftOutputExportErrors({
  controls,
  schema,
  hasVideoExportAction = schemaHasVideoExportPanelAction(schema),
}: {
  controls: readonly ToolcraftVisibleControl[];
  hasVideoExportAction?: boolean;
  schema: ResolvedToolcraftAppSchema;
}): string[] {
  if (!schemaHasPngExportPanelAction(schema)) {
    return [];
  }

  const facts = buildToolcraftOutputExportFacts({
    hasVideoExportAction,
    schema,
  });

  return [
    ...getToolcraftOutputExportLayoutErrors(facts),
    ...getToolcraftOutputBackgroundErrors({ controls, facts }),
    ...getToolcraftImageExportErrors(facts),
  ];
}
