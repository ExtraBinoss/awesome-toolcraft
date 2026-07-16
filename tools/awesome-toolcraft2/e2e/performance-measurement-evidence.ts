import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";

export type ToolcraftFrameProbeResult = {
  longTaskCount: number;
  longTaskMaxMs: number;
  maxFrameGapMs: number;
  sampleCount: number;
};

export type ToolcraftInteractionResult = ToolcraftFrameProbeResult & {
  durationMs: number;
};

export type ToolcraftInteractionOptions = {
  baselineStabilityIntervalMs?: number;
  baselineStabilitySamples?: number;
  expectedOutcome?: unknown;
  observeOutcome?: () => Promise<unknown>;
  outcomePollIntervalMs?: number;
  outcomeTimeoutMs?: number;
  scenarioId?: string;
  settleFrames?: number;
  settleMs?: number;
  stabilityIntervalMs?: number;
  stabilitySamples?: number;
  target?: string;
};

const measurementProvenance = new WeakMap<
  ToolcraftInteractionResult,
  { kind: "animation-frames" | "interaction"; scenarioId: string; target?: string }
>();

export function getToolcraftMeasurementProvenance(
  result: object,
):
  | {
      kind: "animation-frames" | "interaction";
      scenarioId: string;
      target?: string;
    }
  | undefined {
  return measurementProvenance.get(result);
}

export async function finalizeToolcraftMeasurement(
  result: ToolcraftInteractionResult,
  options: ToolcraftInteractionOptions,
  kind: "animation-frames" | "interaction",
): Promise<ToolcraftInteractionResult> {
  const immutableResult = Object.freeze({ ...result });
  if (options.scenarioId) {
    measurementProvenance.set(immutableResult, {
      kind,
      scenarioId: options.scenarioId,
      target: options.target,
    });
    await attachToolcraftBrowserRuntimeEvidence({
      evidenceType: "performance-measurement",
      requirementId: options.scenarioId,
      target: options.target,
    });
    if (kind === "animation-frames") {
      await attachToolcraftBrowserRuntimeEvidence({
        evidenceType: "performance-animation-frames",
        requirementId: options.scenarioId,
        target: options.target,
      });
    }
  }
  return immutableResult;
}
