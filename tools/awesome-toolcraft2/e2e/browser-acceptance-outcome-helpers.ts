import { expect } from "@playwright/test";

import type { ToolcraftBrowserAcceptanceOutcomeEvidenceType } from "../src/app/test-evidence/browser-runtime-contract";
import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";
import {
  getToolcraftBrowserActionTarget,
  isToolcraftBrowserAction,
  runToolcraftBrowserValueAction,
  type ToolcraftBrowserAction,
} from "./browser-proof-session";
import {
  assertToolcraftProducedArtifact,
  type ToolcraftExportArtifactInspectionResult,
  validateToolcraftExportArtifactInspection,
} from "./export-artifact-helpers";
import { expectToolcraftPersistentOutcomeAfterAction } from "./stable-outcome-helpers";

export async function expectToolcraftAcceptanceOutcome<T>(
  observeOutcome: () => Promise<T>,
  action: () => Promise<void>,
  {
    evidenceType,
    requirementId,
    stabilityIntervalMs,
    stabilitySamples,
    timeoutMs = 5_000,
  }: {
    evidenceType: ToolcraftBrowserAcceptanceOutcomeEvidenceType;
    requirementId: string;
    stabilityIntervalMs?: number;
    stabilitySamples?: number;
    timeoutMs?: number;
  },
): Promise<T> {
  if (evidenceType !== "command-side-effect") {
    throw new Error(
      `Generic acceptance outcomes cannot emit specialized evidence "${String(evidenceType)}". Use the protected semantic recipe for that behavior.`,
    );
  }
  const result = await expectToolcraftPersistentOutcomeAfterAction(
    observeOutcome,
    action,
    {
      message: `Acceptance outcome "${requirementId}" should change after the tested action.`,
      stabilityIntervalMs,
      stabilitySamples,
      timeoutMs,
    },
  );
  await attachToolcraftBrowserRuntimeEvidence({ evidenceType, requirementId });
  return result;
}

export async function expectToolcraftReferenceParity<T>(
  observeActual: () => Promise<T>,
  expected: T,
  { requirementId }: { requirementId: string },
): Promise<T> {
  const actual = await observeActual();
  expect(actual, `Reference outcome "${requirementId}" should match the inspected baseline.`).toEqual(
    expected,
  );
  await attachToolcraftBrowserRuntimeEvidence({
    evidenceType: "reference-parity",
    requirementId,
  });
  return actual;
}

export async function expectToolcraftExportedArtifact<
  TArtifact,
  TObservation extends ToolcraftExportArtifactInspectionResult,
>(
  produceArtifact:
    | (() => Promise<TArtifact>)
    | ToolcraftBrowserAction<"interaction", TArtifact>,
  verifyArtifact: (
    artifact: TArtifact,
  ) => Promise<TObservation> | TObservation,
  { requirementId }: { requirementId: string },
): Promise<TArtifact> {
  const target = isToolcraftBrowserAction(produceArtifact)
    ? getToolcraftBrowserActionTarget(produceArtifact)
    : undefined;
  const artifact = isToolcraftBrowserAction(produceArtifact)
    ? await runToolcraftBrowserValueAction(produceArtifact)
    : await produceArtifact();
  assertToolcraftProducedArtifact(artifact, requirementId);
  const observation = await verifyArtifact(artifact);
  validateToolcraftExportArtifactInspection(observation, requirementId);
  await attachToolcraftBrowserRuntimeEvidence({
    evidenceType: "exported-artifact",
    requirementId,
    target,
  });
  return artifact;
}
