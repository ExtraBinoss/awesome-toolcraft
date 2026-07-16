export type ToolcraftExportArtifactInspection = {
  byteLength: number;
  contentHash?: string;
  durationMs?: number;
  frameCount?: number;
  height?: number;
  mediaType?: string;
  width?: number;
};

export type ToolcraftExportArtifactInspectionResult =
  | ToolcraftExportArtifactInspection
  | readonly ToolcraftExportArtifactInspection[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertPositiveFiniteNumber(
  value: unknown,
  field: string,
  requirementId: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(
      `Export requirement "${requirementId}" must report a positive ${field}.`,
    );
  }
}

function assertPositiveInteger(
  value: unknown,
  field: string,
  requirementId: string,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `Export requirement "${requirementId}" must report a positive ${field} integer.`,
    );
  }
}

export function assertToolcraftProducedArtifact(
  artifact: unknown,
  requirementId: string,
): void {
  const isEmptyKnownArtifact =
    artifact === null ||
    artifact === undefined ||
    (typeof artifact === "string" && artifact.length === 0) ||
    (artifact instanceof ArrayBuffer && artifact.byteLength === 0) ||
    (ArrayBuffer.isView(artifact) && artifact.byteLength === 0) ||
    (artifact instanceof Blob && artifact.size === 0) ||
    (Array.isArray(artifact) && artifact.length === 0);

  if (isEmptyKnownArtifact) {
    throw new Error(
      `Export requirement "${requirementId}" must produce a non-empty export artifact before verification.`,
    );
  }
}

export function validateToolcraftExportArtifactInspection(
  observation: unknown,
  requirementId: string,
): ToolcraftExportArtifactInspectionResult {
  const observations = Array.isArray(observation) ? observation : [observation];
  if (observations.length === 0) {
    throw new Error(
      `Export requirement "${requirementId}" must inspect at least one artifact.`,
    );
  }

  for (const inspection of observations) {
    if (!isRecord(inspection) || !("byteLength" in inspection)) {
      throw new Error(
        `Export requirement "${requirementId}" must return a typed artifact inspection with byteLength.`,
      );
    }

    assertPositiveInteger(inspection.byteLength, "byteLength", requirementId);
    if (inspection.durationMs !== undefined) {
      assertPositiveFiniteNumber(
        inspection.durationMs,
        "durationMs",
        requirementId,
      );
    }
    for (const field of ["frameCount", "height", "width"] as const) {
      if (inspection[field] !== undefined) {
        assertPositiveInteger(inspection[field], field, requirementId);
      }
    }
    for (const field of ["contentHash", "mediaType"] as const) {
      if (
        inspection[field] !== undefined &&
        (typeof inspection[field] !== "string" || !inspection[field].trim())
      ) {
        throw new Error(
          `Export requirement "${requirementId}" must report a non-empty ${field} when it is present.`,
        );
      }
    }
  }

  return observation as ToolcraftExportArtifactInspectionResult;
}

export function getToolcraftSemanticArtifactSignature(
  inspection: ToolcraftExportArtifactInspection,
  requirementId: string,
): string {
  validateToolcraftExportArtifactInspection(inspection, requirementId);
  if (!inspection.contentHash?.trim()) {
    throw new Error(
      `Export requirement "${requirementId}" must report contentHash from decoded product output for semantic comparison.`,
    );
  }

  return JSON.stringify({
    contentHash: inspection.contentHash,
    durationMs: inspection.durationMs,
    frameCount: inspection.frameCount,
    height: inspection.height,
    mediaType: inspection.mediaType,
    width: inspection.width,
  });
}
