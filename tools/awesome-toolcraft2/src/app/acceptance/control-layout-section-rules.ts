import {
  getToolcraftColorBankDescriptionError,
  getToolcraftColorBankLabelErrors,
} from "./color-bank-labels";
import {
  getToolcraftControlDescriptionError,
  getToolcraftGenericControlLabelError,
} from "./control-labels";
import type { ToolcraftControlLayoutFacts } from "./control-layout-model";
import {
  controlTypeSectionTitlePattern,
  genericControlSectionTitlePattern,
} from "./section-title-rules";

const broadControlSectionTitlePattern =
  /^(animation|export|flow|icon|logo|motion|output|scene|shape|shapes|text|typography|visual|visuals)$/i;

const maxPreferredControlsPerSection = 7;
const maxHardControlsPerSection = 10;

export function getToolcraftControlLayoutSectionInvariantErrors(
  facts: ToolcraftControlLayoutFacts,
): string[] {
  const errors: string[] = [];

  for (const section of facts.sections) {
    const {
      controls,
      sectionLabel,
      sectionLoosePrefixes,
      sectionTitle,
      semanticClusters,
    } = section;

    if (!sectionTitle) {
      errors.push(
        `${sectionLabel} is missing a controls section title. Every visible controls-panel section must name the product entity, workflow stage, or behavior it edits.`,
      );
    }

    if (sectionTitle && genericControlSectionTitlePattern.test(sectionTitle)) {
      errors.push(
        `${sectionLabel} is too generic for a controls section. Name the product entity, workflow stage, or behavior it edits instead of using a bucket title.`,
      );
    }

    if (sectionTitle && controlTypeSectionTitlePattern.test(sectionTitle)) {
      errors.push(
        `${sectionLabel} names a UI control type instead of the product entity. Group controls by product meaning, not by Slider, Color, Input, Button, or similar component type.`,
      );
    }

    const missingSemanticGroups = controls
      .filter(([, control]) => !control.semanticGroup?.trim())
      .map(([controlId]) => controlId);

    if (
      controls.length > maxPreferredControlsPerSection &&
      missingSemanticGroups.length > 0
    ) {
      errors.push(
        `${sectionLabel} has ${controls.length} controls and must declare semanticGroup for every control so cohesion is checked from typed product intent rather than labels. Missing: ${missingSemanticGroups.join(", ")}.`,
      );
    }
    errors.push(
      ...getToolcraftColorBankLabelErrors({
        controls,
        sectionLabel,
        sectionTitle,
      }),
    );

    for (const [controlId, control] of controls) {
      const genericLabelError = getToolcraftGenericControlLabelError({
        control,
        controlId,
        sectionLabel,
        sectionLoosePrefixCount: sectionLoosePrefixes.size,
        sectionTitle,
      });

      if (genericLabelError) {
        errors.push(genericLabelError);
      }

      const colorDescriptionError = getToolcraftColorBankDescriptionError({
        control,
        controlId,
        sectionLabel,
        sectionTitle,
      });

      if (colorDescriptionError) {
        errors.push(colorDescriptionError);
      }

      const descriptionError = getToolcraftControlDescriptionError({
        control,
        controlId,
        sectionLabel,
        sectionTitle,
      });

      if (descriptionError) {
        errors.push(descriptionError);
      }
    }
  }

  for (const { count, label } of facts.sectionTitleCounts.values()) {
    if (count > 1) {
      errors.push(
        `Controls panel repeats the section title "${label}" ${count} times. Section titles must be unique and describe distinct product entities or workflow stages.`,
      );
    }
  }

  return errors;
}

export function getToolcraftControlLayoutSectionHeuristicErrors(
  facts: ToolcraftControlLayoutFacts,
): string[] {
  const errors: string[] = [];

  for (const section of facts.sections) {
    const {
      controls,
      sectionLabel,
      sectionTitle,
      semanticClusters,
    } = section;
    const clusterList = [...semanticClusters].join(", ");
    const hasBroadSectionTitle =
      sectionTitle !== undefined && broadControlSectionTitlePattern.test(sectionTitle);

    if (
      controls.length > maxPreferredControlsPerSection &&
      hasBroadSectionTitle &&
      semanticClusters.size >= 3
    ) {
      errors.push(
        `${sectionLabel} has ${controls.length} controls across multiple semantic clusters (${clusterList}). Broad section titles are only valid for small cohesive groups; split this into discrete sections with specific titles such as motion, geometry, density, color, typography, or export sub-entities.`,
      );
    }

    if (controls.length > maxHardControlsPerSection && semanticClusters.size > 1) {
      errors.push(
        `${sectionLabel} has ${controls.length} controls across ${semanticClusters.size} semantic clusters (${clusterList}). Controls-panel sections should stay discrete; split sections that grow past ${maxHardControlsPerSection} controls unless every control edits one tightly scoped entity.`,
      );
    }
  }

  return errors;
}

export function getToolcraftControlLayoutSectionErrors(
  facts: ToolcraftControlLayoutFacts,
): string[] {
  return [
    ...getToolcraftControlLayoutSectionInvariantErrors(facts),
    ...getToolcraftControlLayoutSectionHeuristicErrors(facts),
  ];
}
