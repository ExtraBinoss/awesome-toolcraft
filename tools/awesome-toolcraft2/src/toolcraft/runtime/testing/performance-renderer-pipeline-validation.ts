import type { ResolvedToolcraftAppSchema } from "../schema/types";
import type {
  ToolcraftPerformanceConfig,
  ToolcraftPerformanceInteraction,
  ToolcraftPipelineInteraction,
  ToolcraftRenderPass,
  ToolcraftRenderPassKind,
  ToolcraftRenderPassOutput,
  ToolcraftRenderPassQuality,
  ToolcraftRenderPassRunLocation,
  ToolcraftRendererPipeline,
} from "./performance-types";

const renderPassKinds = new Set<ToolcraftRenderPassKind>([
  "decode",
  "preprocess",
  "pixel-transform",
  "vector-build",
  "text-layout",
  "rasterize",
  "composite",
  "handles",
  "export",
]);

const renderPassRunLocations = new Set<ToolcraftRenderPassRunLocation>([
  "main",
  "worker",
  "gpu",
  "worker-or-gpu",
  "export-only",
]);

const renderPassOutputs = new Set<ToolcraftRenderPassOutput>([
  "source",
  "intermediate",
  "preview",
  "overlay",
  "export",
]);

const renderPassQualities = new Set<ToolcraftRenderPassQuality>([
  "preview",
  "full",
  "retina",
  "export",
]);

const pipelineInteractions = new Set<ToolcraftPipelineInteraction>([
  "animation-frame",
  "control-change",
  "control-drag",
  "media-import",
  "mask-drag",
  "viewport-drag",
  "viewport-zoom",
  "timeline-playback",
  "timeline-scrub",
  "export",
]);

const expensiveRenderPassKinds = new Set<ToolcraftRenderPassKind>([
  "decode",
  "preprocess",
  "pixel-transform",
  "text-layout",
  "rasterize",
]);

const cacheRequiredRenderPassKinds = new Set<ToolcraftRenderPassKind>([
  ...expensiveRenderPassKinds,
  "composite",
]);

const highFrequencyViewportInteractions = new Set<ToolcraftPipelineInteraction>([
  "animation-frame",
  "mask-drag",
  "timeline-playback",
  "timeline-scrub",
  "viewport-drag",
  "viewport-zoom",
]);

const vaguePipelineReferencePattern =
  /^(?:all|all values|everything|props|runtime|settings|state|values)$/i;

function getPassById(
  pipeline: ToolcraftRendererPipeline,
): Map<string, ToolcraftRenderPass> {
  return new Map(pipeline.passes.map((pass) => [pass.id, pass]));
}

export function hasMainThreadCanvasRasterCompositePreviewPressure(
  config: ToolcraftPerformanceConfig,
): boolean {
  if (config.rendererStrategy !== "canvas-2d" || !config.rendererPipeline) {
    return false;
  }

  const hasMainThreadRasterPass = config.rendererPipeline.passes.some(
    (pass) =>
      pass.runsOn === "main" &&
      (pass.kind === "rasterize" || pass.kind === "pixel-transform") &&
      (pass.output === "intermediate" || pass.output === "preview") &&
      (pass.quality === "full" || pass.quality === "retina"),
  );
  const hasMainThreadPreviewComposite = config.rendererPipeline.passes.some(
    (pass) =>
      pass.runsOn === "main" &&
      pass.kind === "composite" &&
      pass.output === "preview" &&
      (pass.quality === "full" || pass.quality === "retina"),
  );

  return hasMainThreadRasterPass && hasMainThreadPreviewComposite;
}

function hasPipelineReference(value: string): boolean {
  return value.trim().length > 0 && !vaguePipelineReferencePattern.test(value.trim());
}

function getPipelineReferenceErrors(
  passId: string,
  field: string,
  references: readonly string[] | undefined,
): string[] {
  if (!references || references.length === 0) {
    return [`rendererPipeline pass "${passId}" must list ${field}.`];
  }

  return references.flatMap((reference) =>
    hasPipelineReference(reference)
      ? []
      : [
          `rendererPipeline pass "${passId}" ${field} entry "${reference}" is too vague. Name the concrete runtime target, source key, resource key, or cache key part.`,
        ],
  );
}

function getPipelineInteractionForScenario(
  interaction: ToolcraftPerformanceInteraction,
): ToolcraftPipelineInteraction | null {
  switch (interaction) {
    case "animation-frame":
      return "animation-frame";
    case "animation-viewport-drag":
      return "viewport-drag";
    case "control-change":
      return "control-change";
    case "control-drag":
      return "control-drag";
    case "export-copy":
      return "export";
    case "mask-drag":
      return "mask-drag";
    case "media-import":
      return "media-import";
    case "preview-render":
      return null;
    case "timeline-playback":
      return "timeline-playback";
    case "timeline-scrub":
      return "timeline-scrub";
    case "viewport-zoom-stress":
      return "viewport-zoom";
    case "viewport-stability":
      return null;
  }
}

export function getRendererPipelineErrors(
  _schema: ResolvedToolcraftAppSchema,
  config: ToolcraftPerformanceConfig,
): string[] {
  const errors: string[] = [];
  const pipeline = config.rendererPipeline;

  if (config.usesCustomRenderer && !pipeline) {
    return [
      "Custom renderers must declare rendererPipeline so render passes, cache keys, and invalidation are machine-checkable.",
    ];
  }

  if (!config.usesCustomRenderer && pipeline) {
    return ["Non-custom renderer configs must omit rendererPipeline."];
  }

  if (!pipeline) {
    return errors;
  }

  if (pipeline.passes.length === 0) {
    errors.push("rendererPipeline must declare at least one render pass.");
  }

  if (pipeline.interactionInvalidation.length === 0) {
    errors.push(
      "rendererPipeline must declare interactionInvalidation so high-frequency UI work cannot accidentally invalidate expensive passes.",
    );
  }

  const passIds = new Set<string>();

  for (const pass of pipeline.passes) {
    const passId = pass.id.trim();

    if (!passId) {
      errors.push("rendererPipeline passes must have non-empty ids.");
    } else if (passIds.has(passId)) {
      errors.push(`rendererPipeline pass id "${passId}" must be unique.`);
    } else {
      passIds.add(passId);
    }

    if (!renderPassKinds.has(pass.kind)) {
      errors.push(`rendererPipeline pass "${pass.id}" kind "${pass.kind}" is not supported.`);
    }

    if (!renderPassRunLocations.has(pass.runsOn)) {
      errors.push(
        `rendererPipeline pass "${pass.id}" runsOn "${pass.runsOn}" is not supported.`,
      );
    }

    if (!renderPassOutputs.has(pass.output)) {
      errors.push(
        `rendererPipeline pass "${pass.id}" output "${pass.output}" is not supported.`,
      );
    }

    if (!renderPassQualities.has(pass.quality)) {
      errors.push(
        `rendererPipeline pass "${pass.id}" quality "${pass.quality}" is not supported.`,
      );
    }

    errors.push(...getPipelineReferenceErrors(pass.id, "inputs", pass.inputs));
    errors.push(...getPipelineReferenceErrors(pass.id, "invalidatedBy", pass.invalidatedBy));

    if (pass.cacheKey) {
      errors.push(...getPipelineReferenceErrors(pass.id, "cacheKey", pass.cacheKey));
    }

    if (
      cacheRequiredRenderPassKinds.has(pass.kind) &&
      (!pass.cacheKey || pass.cacheKey.length === 0)
    ) {
      errors.push(
        `rendererPipeline pass "${pass.id}" is a cache-sensitive ${pass.kind} pass and must declare cacheKey so tests can reject full recomputation on every control change.`,
      );
    }

    if (pass.kind === "decode") {
      const hasMediaImportScenario = config.scenarios.some(
        (scenario) => scenario.interaction === "media-import",
      );

      if (!hasMediaImportScenario) {
        errors.push(
          `rendererPipeline pass "${pass.id}" decodes media, so performance scenarios must include media-import coverage.`,
        );
      }
    }
  }

  const passesById = getPassById(pipeline);
  const invalidationTargets = new Set<string>();
  const pipelineInteractionSet = new Set(
    pipeline.interactionInvalidation.map((invalidation) => invalidation.interaction),
  );

  for (const invalidation of pipeline.interactionInvalidation) {
    if (!pipelineInteractions.has(invalidation.interaction)) {
      errors.push(
        `rendererPipeline interaction "${invalidation.interaction}" is not supported.`,
      );
    }

    errors.push(
      ...getPipelineReferenceErrors(
        invalidation.interaction,
        "targets",
        invalidation.targets,
      ),
    );

    for (const target of invalidation.targets) {
      if (hasPipelineReference(target)) {
        invalidationTargets.add(target);
      }
    }

    const mustNotInvalidate = new Set(invalidation.mustNotInvalidate ?? []);

    for (const passId of invalidation.invalidates) {
      if (!passId.trim()) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} invalidates contains an empty pass id.`,
        );
        continue;
      }

      const pass = passesById.get(passId);

      if (!pass) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} invalidates unknown pass "${passId}".`,
        );
        continue;
      }

      if (mustNotInvalidate.has(passId)) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} cannot both invalidate and mustNotInvalidate pass "${passId}".`,
        );
      }

      if (
        highFrequencyViewportInteractions.has(invalidation.interaction) &&
        expensiveRenderPassKinds.has(pass.kind)
      ) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} must not invalidate expensive pass "${passId}" (${pass.kind}). Move viewport work to transforms/uniforms or explain it through a cheaper pass.`,
        );
      }
    }

    for (const passId of invalidation.mustNotInvalidate ?? []) {
      if (!passId.trim()) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} mustNotInvalidate contains an empty pass id.`,
        );
      } else if (!passesById.has(passId)) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} mustNotInvalidate unknown pass "${passId}".`,
        );
      }
    }
  }

  for (const scenario of config.scenarios) {
    const pipelineInteraction = getPipelineInteractionForScenario(scenario.interaction);

    if (pipelineInteraction && !pipelineInteractionSet.has(pipelineInteraction)) {
      errors.push(
        `Performance scenario ${scenario.id} exercises ${pipelineInteraction}, so rendererPipeline.interactionInvalidation must declare that interaction.`,
      );
    }
  }

  for (const target of config.workloadTargets) {
    if (!invalidationTargets.has(target)) {
      errors.push(
        `Performance workload target ${target} must appear in rendererPipeline interactionInvalidation targets.`,
      );
    }
  }

  return errors;
}
