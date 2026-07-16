import type { ResolvedToolcraftAppSchema } from "@/toolcraft/runtime";

import { isToolcraftProductSectionControl } from "./controls";
import { getToolcraftSectionLabel } from "./sections";
import type { ToolcraftControlSectionInventoryEntry } from "./types";

export function getToolcraftSectionInventoryByTitle(
  sectionInventory: readonly ToolcraftControlSectionInventoryEntry[],
): Map<string, ToolcraftControlSectionInventoryEntry> {
  return new Map(
    sectionInventory.map((entry) => [entry.title.trim(), entry]),
  );
}

export function hasToolcraftInventorySplitEvidence({
  sectionInventoryByTitle,
  sections,
}: {
  sectionInventoryByTitle: ReadonlyMap<string, ToolcraftControlSectionInventoryEntry>;
  sections: ReadonlySet<string>;
}): boolean {
  const entries = [...sections].map((sectionLabel) =>
    sectionInventoryByTitle.get(sectionLabel),
  );

  return (
    entries.length === sections.size &&
    entries.every(
      (entry) =>
        entry &&
        (entry.workflowStage?.trim().length ?? 0) > 0 &&
        (entry.splitReason?.trim().length ?? 0) >= 12,
    )
  );
}

export function getToolcraftControlSectionInventoryErrors(
  schema: ResolvedToolcraftAppSchema,
  sectionInventory: readonly ToolcraftControlSectionInventoryEntry[],
): string[] {
  const errors: string[] = [];

  if (sectionInventory.length === 0) {
    return errors;
  }

  const schemaSections = (schema.panels.controls?.sections ?? []).flatMap(
    (section, sectionIndex) => {
      const targets = Object.values(section.controls)
        .filter(isToolcraftProductSectionControl)
        .map((control) => control.target);

      if (targets.length === 0) {
        return [];
      }

      return [
        {
          label: getToolcraftSectionLabel(section.title, sectionIndex),
          targets,
        },
      ];
    },
  );
  const schemaSectionTitles = new Set(schemaSections.map((section) => section.label));
  const schemaTargetToSection = new Map<string, string>();

  for (const section of schemaSections) {
    for (const target of section.targets) {
      schemaTargetToSection.set(target, section.label);
    }
  }

  const inventoryTitleCounts = new Map<string, number>();
  const inventoryTargetToSection = new Map<string, string>();

  for (const entry of sectionInventory) {
    const title = entry.title.trim();
    const entity = entry.entity?.trim() ?? "";
    const workflowStage = entry.workflowStage?.trim() ?? "";
    const groupingReason = entry.groupingReason.trim();
    const splitReason = entry.splitReason?.trim() ?? "";

    if (!title) {
      errors.push(
        "Control Section Inventory contains an entry without a section title.",
      );
      continue;
    }

    inventoryTitleCounts.set(title, (inventoryTitleCounts.get(title) ?? 0) + 1);

    if (!schemaSectionTitles.has(title)) {
      errors.push(
        `Control Section Inventory references "${title}", but no rendered product controls section uses that title.`,
      );
    }

    if (!entity && !workflowStage) {
      errors.push(
        `Control Section Inventory entry "${title}" must declare entity or workflowStage so grouping is based on product meaning, not UI layout.`,
      );
    }

    if (groupingReason.length < 12) {
      errors.push(
        `Control Section Inventory entry "${title}" must include a concrete groupingReason explaining why these controls belong together.`,
      );
    }

    if (splitReason && splitReason.length < 12) {
      errors.push(
        `Control Section Inventory entry "${title}" splitReason is too vague. Explain the product workflow split or omit splitReason.`,
      );
    }

    if (entry.targets.length === 0) {
      errors.push(
        `Control Section Inventory entry "${title}" must list the product control targets rendered in that section.`,
      );
    }

    for (const target of entry.targets) {
      const schemaSection = schemaTargetToSection.get(target);

      if (!schemaSection) {
        errors.push(
          `Control Section Inventory entry "${title}" lists target "${target}", but that target is not rendered by any product controls section.`,
        );
        continue;
      }

      if (schemaSection !== title) {
        errors.push(
          `Control Section Inventory entry "${title}" lists target "${target}", but the schema renders it in "${schemaSection}". Update the schema grouping or the inventory.`,
        );
      }

      const existingSection = inventoryTargetToSection.get(target);

      if (existingSection && existingSection !== title) {
        errors.push(
          `Control Section Inventory lists target "${target}" in both "${existingSection}" and "${title}". Each product control target belongs to exactly one section inventory entry.`,
        );
      }

      inventoryTargetToSection.set(target, title);
    }
  }

  for (const [title, count] of inventoryTitleCounts) {
    if (count > 1) {
      errors.push(
        `Control Section Inventory repeats section "${title}" ${count} times. Section inventory entries must be unique.`,
      );
    }
  }

  for (const section of schemaSections) {
    const entry = sectionInventory.find(
      (inventoryEntry) => inventoryEntry.title.trim() === section.label,
    );

    if (!entry) {
      errors.push(
        `Control Section Inventory is missing product section "${section.label}". Add its entity/workflow stage, targets, and groupingReason.`,
      );
      continue;
    }

    const inventoryTargets = new Set(entry.targets);

    for (const target of section.targets) {
      if (!inventoryTargets.has(target)) {
        errors.push(
          `Control Section Inventory entry "${section.label}" is missing rendered target "${target}". The inventory must cover every product control in the section.`,
        );
      }
    }
  }

  return errors;
}
