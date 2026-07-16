import { isToolcraftTimelinePanelRuntimeTarget } from "../schema/runtime-targets";
import type { ResolvedToolcraftAppSchema } from "../schema/types";
import { isToolcraftPersistenceRecord } from "./persistence-shared";

function getKnownValueTargets(schema: ResolvedToolcraftAppSchema): Set<string> {
  const targets = new Set<string>();

  for (const section of schema.panels.controls?.sections ?? []) {
    for (const control of Object.values(section.controls)) {
      if (
        control.type !== "panelActions" &&
        !isToolcraftTimelinePanelRuntimeTarget(control.target)
      ) {
        targets.add(control.target);
      }
    }
  }

  return targets;
}

export function readValues(
  schema: ResolvedToolcraftAppSchema,
  value: unknown,
): Record<string, unknown> | undefined {
  if (!isToolcraftPersistenceRecord(value)) {
    return undefined;
  }

  const targets = getKnownValueTargets(schema);
  const values: Record<string, unknown> = {};

  for (const target of targets) {
    if (Object.hasOwn(value, target)) {
      values[target] = value[target];
    }
  }

  return Object.keys(values).length > 0 ? values : undefined;
}
