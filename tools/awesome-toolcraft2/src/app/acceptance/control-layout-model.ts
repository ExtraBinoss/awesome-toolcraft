import type {
  ResolvedToolcraftAppSchema,
  ToolcraftControlSchema,
} from "@/toolcraft/runtime";

import { isToolcraftProductSectionControl } from "./controls";
import { getToolcraftSectionLabel } from "./sections";
import {
  getToolcraftLooseTargetPrefix,
  getToolcraftStrictTargetPrefix,
  normalizeToolcraftSemanticText,
} from "./semantic";

export type ToolcraftControlLayoutControlEntry = {
  control: ToolcraftControlSchema;
  controlId: string;
  loosePrefix: string | null;
  sectionLabel: string;
  sectionTitle: string | undefined;
};

export type ToolcraftControlLayoutSectionFact = {
  controls: readonly [string, ToolcraftControlSchema][];
  sectionLabel: string;
  sectionLoosePrefixes: ReadonlySet<string>;
  sectionTitle: string | undefined;
  semanticClusters: ReadonlySet<string>;
};

export type ToolcraftControlLayoutFacts = {
  colorSectionLoosePrefixes: ReadonlyMap<string, string>;
  controlsByTarget: ReadonlyMap<string, ToolcraftControlLayoutControlEntry>;
  loosePrefixSections: ReadonlyMap<string, ReadonlySet<string>>;
  sectionTitleCounts: ReadonlyMap<string, { count: number; label: string }>;
  sections: readonly ToolcraftControlLayoutSectionFact[];
  strictPrefixSections: ReadonlyMap<string, ReadonlySet<string>>;
  visibleControls: readonly ToolcraftControlLayoutControlEntry[];
};

function getToolcraftControlSemanticCluster(
  control: ToolcraftControlSchema,
): string {
  return (
    control.semanticGroup?.trim() ||
    getToolcraftLooseTargetPrefix(control.target) ||
    control.orderRole ||
    control.type
  );
}

function addSectionToPrefixMap(
  sectionMap: Map<string, Set<string>>,
  prefix: string | null,
  sectionLabel: string,
): void {
  if (!prefix) {
    return;
  }

  const sections = sectionMap.get(prefix) ?? new Set<string>();
  sections.add(sectionLabel);
  sectionMap.set(prefix, sections);
}

function updateSectionTitleCounts(
  sectionTitleCounts: Map<string, { count: number; label: string }>,
  sectionTitle: string | undefined,
): void {
  if (!sectionTitle) {
    return;
  }

  const normalizedSectionTitle = normalizeToolcraftSemanticText(sectionTitle);
  const titleCount = sectionTitleCounts.get(normalizedSectionTitle);
  sectionTitleCounts.set(normalizedSectionTitle, {
    count: (titleCount?.count ?? 0) + 1,
    label: titleCount?.label ?? sectionTitle,
  });
}

export function buildToolcraftControlLayoutFacts(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftControlLayoutFacts {
  const sections: ToolcraftControlLayoutSectionFact[] = [];
  const visibleControls: ToolcraftControlLayoutControlEntry[] = [];
  const strictPrefixSections = new Map<string, Set<string>>();
  const loosePrefixSections = new Map<string, Set<string>>();
  const colorSectionLoosePrefixes = new Map<string, string>();
  const sectionTitleCounts = new Map<string, { count: number; label: string }>();
  const controlsByTarget = new Map<string, ToolcraftControlLayoutControlEntry>();

  for (const [sectionIndex, section] of (schema.panels.controls?.sections ?? []).entries()) {
    const sectionTitle = section.title?.trim();
    const sectionLabel = getToolcraftSectionLabel(sectionTitle, sectionIndex);
    const controls = Object.entries(section.controls).filter(([, control]) =>
      isToolcraftProductSectionControl(control),
    );

    if (controls.length === 0) {
      continue;
    }

    updateSectionTitleCounts(sectionTitleCounts, sectionTitle);

    const sectionLoosePrefixes = new Set(
      controls
        .map(([, control]) => getToolcraftLooseTargetPrefix(control.target))
        .filter((prefix): prefix is string => Boolean(prefix)),
    );
    const semanticClusters = new Set(
      controls.map(([, control]) => getToolcraftControlSemanticCluster(control)),
    );
    const isColorOnlySection = controls.every(
      ([, control]) => control.type === "color",
    );

    sections.push({
      controls,
      sectionLabel,
      sectionLoosePrefixes,
      sectionTitle,
      semanticClusters,
    });

    for (const [controlId, control] of controls) {
      const strictPrefix = getToolcraftStrictTargetPrefix(control.target);
      const entry: ToolcraftControlLayoutControlEntry = {
        control,
        controlId,
        loosePrefix: getToolcraftLooseTargetPrefix(control.target),
        sectionLabel,
        sectionTitle,
      };

      visibleControls.push(entry);
      controlsByTarget.set(control.target, entry);
      addSectionToPrefixMap(strictPrefixSections, strictPrefix, sectionLabel);
      addSectionToPrefixMap(loosePrefixSections, entry.loosePrefix, sectionLabel);

      if (
        control.type === "color" &&
        isColorOnlySection &&
        entry.loosePrefix
      ) {
        colorSectionLoosePrefixes.set(entry.loosePrefix, `${sectionLabel} / ${controlId}`);
      }
    }
  }

  return {
    colorSectionLoosePrefixes,
    controlsByTarget,
    loosePrefixSections,
    sectionTitleCounts,
    sections,
    strictPrefixSections,
    visibleControls,
  };
}
