import type {
  ToolcraftControlConditionSchema,
  ToolcraftControlSchema,
} from "@/toolcraft/runtime";

import type { ToolcraftControlLayoutFacts } from "./control-layout-model";
import { normalizeToolcraftSemanticText } from "./semantic";

function normalizeToolcraftConditionValue(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const normalized = normalizeToolcraftSemanticText(String(value));
    return normalized || null;
  }

  return null;
}

function getToolcraftConditionBranchTexts(
  condition: ToolcraftControlConditionSchema,
  gateControl: ToolcraftControlSchema,
): string[] {
  const rawValues =
    "equals" in condition
      ? [condition.equals]
      : Array.isArray(condition.oneOf)
        ? [...condition.oneOf]
        : [];
  const normalizedValues = rawValues
    .map(normalizeToolcraftConditionValue)
    .filter((value): value is string => Boolean(value));
  const optionLabels = (gateControl.options ?? [])
    .filter((option) =>
      normalizedValues.includes(normalizeToolcraftSemanticText(option.value)),
    )
    .map((option) => normalizeToolcraftSemanticText(option.label))
    .filter(Boolean);

  return [...new Set([...normalizedValues, ...optionLabels])];
}

function sectionTitleLooksLikeDependencyBranch({
  condition,
  gateControl,
  sectionTitle,
}: {
  condition: ToolcraftControlConditionSchema;
  gateControl: ToolcraftControlSchema;
  sectionTitle: string | undefined;
}): boolean {
  const sectionText = normalizeToolcraftSemanticText(sectionTitle);

  if (!sectionText) {
    return false;
  }

  return getToolcraftConditionBranchTexts(condition, gateControl).some(
    (branchText) =>
      branchText.length > 2 &&
      (sectionText === branchText ||
        sectionText.includes(branchText) ||
        branchText.includes(sectionText)),
  );
}

export function getToolcraftControlDependencyGroupingErrors(
  facts: ToolcraftControlLayoutFacts,
): string[] {
  const errors: string[] = [];

  for (const item of facts.visibleControls) {
    for (const [conditionName, condition] of [
      ["visibleWhen", item.control.visibleWhen],
      ["disabledWhen", item.control.disabledWhen],
    ] as const) {
      if (!condition || !item.loosePrefix) {
        continue;
      }

      const gateControl = facts.controlsByTarget.get(condition.target);

      if (!gateControl || gateControl.sectionLabel === item.sectionLabel) {
        continue;
      }

      const sharesTargetEntity =
        gateControl.loosePrefix !== null &&
        gateControl.loosePrefix === item.loosePrefix;
      const looksLikeBranchSection =
        conditionName === "visibleWhen" &&
        sectionTitleLooksLikeDependencyBranch({
          condition,
          gateControl: gateControl.control,
          sectionTitle: item.sectionTitle,
        });

      if (!sharesTargetEntity && !looksLikeBranchSection) {
        continue;
      }

      errors.push(
        `${item.sectionLabel} / ${item.controlId} is gated by ${conditionName} target "${condition.target}" in ${gateControl.sectionLabel}, but it belongs to the same dependency group. Keep selectors and their dependent controls in one semantic section when they describe one product entity or branch; use visibleWhen for branch-specific controls inside that section instead of splitting branch controls into their own section. Do not use disabledWhen for product controls.`,
      );
    }
  }

  return errors;
}
