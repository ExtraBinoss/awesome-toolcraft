import { expect } from "@playwright/test";

import {
  createToolcraftSemanticTransitionOptions,
  expectToolcraftExpectedOutcomeAfterAction,
  type ToolcraftSemanticEvidenceOptions,
} from "./browser-acceptance-transition-helpers";
import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";
import type {
  ToolcraftBrowserAction,
  ToolcraftBrowserObservation,
} from "./browser-proof-session";

export type ToolcraftLayerCollectionObservation = {
  layerIds: readonly string[];
  outputSignature: string;
};

export type ToolcraftLayerGroupingObservation =
  ToolcraftLayerCollectionObservation & {
    groupSignature: string;
  };

export type ToolcraftLayerSelectedControlObservation = {
  controlValue: unknown;
  outputSignature: string;
  selectedLayerId: string;
};

export type ToolcraftLayerSelectionObservation = {
  selectedLayerId: string;
};

export type ToolcraftLayerVisibilityObservation = {
  layerId: string;
  outputSignature: string;
  visible: boolean;
};

function validateIdentifier(value: string, message: string): void {
  expect(value.trim(), message).not.toBe("");
}

function validateLayerCollection(
  observation: ToolcraftLayerCollectionObservation,
  requirementId: string,
): void {
  expect(
    new Set(observation.layerIds).size,
    `Layer evidence "${requirementId}" must report unique layer ids.`,
  ).toBe(observation.layerIds.length);
  expect(
    observation.layerIds.every((layerId) => layerId.trim().length > 0),
    `Layer evidence "${requirementId}" must report non-empty layer ids.`,
  ).toBe(true);
  validateIdentifier(
    observation.outputSignature,
    `Layer evidence "${requirementId}" must report product-output semantics.`,
  );
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

async function attachLayerEvidence(
  evidenceType:
    | "layer-grouping"
    | "layer-media-lifecycle"
    | "layer-reorder"
    | "layer-selected-layer-controls"
    | "layer-selection"
    | "layer-visibility",
  requirementId: string,
): Promise<void> {
  await attachToolcraftBrowserRuntimeEvidence({ evidenceType, requirementId });
}

export async function expectToolcraftLayerSelection(
  observeSelection: ToolcraftBrowserObservation<ToolcraftLayerSelectionObservation>,
  action: ToolcraftBrowserAction,
  expected: ToolcraftLayerSelectionObservation,
  options: ToolcraftSemanticEvidenceOptions,
): Promise<ToolcraftLayerSelectionObservation> {
  validateIdentifier(
    expected.selectedLayerId,
    `Layer selection "${options.requirementId}" requires an expected layer id.`,
  );
  const { after } = await expectToolcraftExpectedOutcomeAfterAction(
    observeSelection,
    action,
    expected,
    createToolcraftSemanticTransitionOptions(
      `Layer selection "${options.requirementId}" should select the expected layer.`,
      options,
    ),
  );
  await attachLayerEvidence("layer-selection", options.requirementId);
  return after;
}

export async function expectToolcraftLayerVisibility(
  observeVisibility: ToolcraftBrowserObservation<ToolcraftLayerVisibilityObservation>,
  action: ToolcraftBrowserAction,
  expected: ToolcraftLayerVisibilityObservation,
  options: ToolcraftSemanticEvidenceOptions,
): Promise<ToolcraftLayerVisibilityObservation> {
  validateIdentifier(expected.layerId, "Layer visibility requires a layer id.");
  validateIdentifier(
    expected.outputSignature,
    "Layer visibility requires product-output semantics.",
  );
  const { after, before } = await expectToolcraftExpectedOutcomeAfterAction(
    observeVisibility,
    action,
    expected,
    createToolcraftSemanticTransitionOptions(
      `Layer visibility "${options.requirementId}" should toggle the expected layer and output.`,
      options,
    ),
  );
  expect(before.layerId).toBe(after.layerId);
  expect(before.visible).not.toBe(after.visible);
  expect(before.outputSignature).not.toBe(after.outputSignature);
  await attachLayerEvidence("layer-visibility", options.requirementId);
  return after;
}

export async function expectToolcraftLayerReorder(
  observeOrder: ToolcraftBrowserObservation<ToolcraftLayerCollectionObservation>,
  action: ToolcraftBrowserAction,
  expected: ToolcraftLayerCollectionObservation,
  options: ToolcraftSemanticEvidenceOptions,
): Promise<ToolcraftLayerCollectionObservation> {
  validateLayerCollection(expected, options.requirementId);
  const { after, before } = await expectToolcraftExpectedOutcomeAfterAction(
    observeOrder,
    action,
    expected,
    createToolcraftSemanticTransitionOptions(
      `Layer reorder "${options.requirementId}" should reach the expected order and output.`,
      options,
    ),
  );
  validateLayerCollection(before, options.requirementId);
  expect(sorted(before.layerIds)).toEqual(sorted(after.layerIds));
  expect(before.layerIds).not.toEqual(after.layerIds);
  expect(before.outputSignature).not.toBe(after.outputSignature);
  await attachLayerEvidence("layer-reorder", options.requirementId);
  return after;
}

export async function expectToolcraftLayerGrouping(
  observeGrouping: ToolcraftBrowserObservation<ToolcraftLayerGroupingObservation>,
  action: ToolcraftBrowserAction,
  expected: ToolcraftLayerGroupingObservation,
  options: ToolcraftSemanticEvidenceOptions,
): Promise<ToolcraftLayerGroupingObservation> {
  validateLayerCollection(expected, options.requirementId);
  validateIdentifier(expected.groupSignature, "Layer grouping requires group semantics.");
  const { after, before } = await expectToolcraftExpectedOutcomeAfterAction(
    observeGrouping,
    action,
    expected,
    createToolcraftSemanticTransitionOptions(
      `Layer grouping "${options.requirementId}" should reach the expected hierarchy and output.`,
      options,
    ),
  );
  validateLayerCollection(before, options.requirementId);
  expect(sorted(before.layerIds)).toEqual(sorted(after.layerIds));
  expect(before.groupSignature).not.toBe(after.groupSignature);
  expect(before.outputSignature).not.toBe(after.outputSignature);
  await attachLayerEvidence("layer-grouping", options.requirementId);
  return after;
}

export async function expectToolcraftSelectedLayerControl(
  observeControl: ToolcraftBrowserObservation<ToolcraftLayerSelectedControlObservation>,
  action: ToolcraftBrowserAction,
  expected: ToolcraftLayerSelectedControlObservation,
  options: ToolcraftSemanticEvidenceOptions,
): Promise<ToolcraftLayerSelectedControlObservation> {
  validateIdentifier(expected.selectedLayerId, "Selected-layer control requires a layer id.");
  validateIdentifier(
    expected.outputSignature,
    "Selected-layer control requires product-output semantics.",
  );
  const { after, before } = await expectToolcraftExpectedOutcomeAfterAction(
    observeControl,
    action,
    expected,
    createToolcraftSemanticTransitionOptions(
      `Selected-layer control "${options.requirementId}" should edit the selected layer output.`,
      options,
    ),
  );
  expect(before.selectedLayerId).toBe(after.selectedLayerId);
  expect(before.controlValue).not.toEqual(after.controlValue);
  expect(before.outputSignature).not.toBe(after.outputSignature);
  await attachLayerEvidence(
    "layer-selected-layer-controls",
    options.requirementId,
  );
  return after;
}

export async function expectToolcraftLayerMediaLifecycle(
  observeLayers: ToolcraftBrowserObservation<ToolcraftLayerCollectionObservation>,
  action: ToolcraftBrowserAction,
  expected: ToolcraftLayerCollectionObservation,
  options: ToolcraftSemanticEvidenceOptions,
): Promise<ToolcraftLayerCollectionObservation> {
  validateLayerCollection(expected, options.requirementId);
  const { after, before } = await expectToolcraftExpectedOutcomeAfterAction(
    observeLayers,
    action,
    expected,
    createToolcraftSemanticTransitionOptions(
      `Layer media lifecycle "${options.requirementId}" should reach the expected layer collection and output.`,
      options,
    ),
  );
  validateLayerCollection(before, options.requirementId);
  expect(before.layerIds).not.toEqual(after.layerIds);
  expect(before.outputSignature).not.toBe(after.outputSignature);
  await attachLayerEvidence("layer-media-lifecycle", options.requirementId);
  return after;
}
