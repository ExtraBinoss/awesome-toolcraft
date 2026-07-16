import type {
  ToolcraftPerformanceBudget,
  ToolcraftPerformanceScenario,
} from "./performance-types";

const maxPerformanceBudgetCaps: Required<ToolcraftPerformanceBudget> = {
  maxExportMs: 8000,
  maxFrameGapMs: 120,
  maxInteractionMs: 2000,
  maxLongTaskMs: 250,
  maxPreviewMs: 2000,
  maxRenderMs: 2000,
};

export function hasAnyBudget(budget: ToolcraftPerformanceBudget): boolean {
  return Object.values(budget).some((value) => typeof value === "number" && value > 0);
}

export function hasPositiveBudgetField(
  budget: ToolcraftPerformanceBudget,
  field: keyof ToolcraftPerformanceBudget,
): boolean {
  const value = budget[field];
  return typeof value === "number" && value > 0;
}

export function getMissingInteractionBudgetFields(
  scenario: ToolcraftPerformanceScenario,
): string[] {
  switch (scenario.interaction) {
    case "animation-frame":
      return hasPositiveBudgetField(scenario.budget, "maxFrameGapMs")
        ? hasPositiveBudgetField(scenario.budget, "maxLongTaskMs")
          ? []
          : ["maxLongTaskMs"]
        : hasPositiveBudgetField(scenario.budget, "maxLongTaskMs")
          ? ["maxFrameGapMs"]
          : ["maxFrameGapMs", "maxLongTaskMs"];
    case "animation-viewport-drag":
    case "mask-drag":
    case "viewport-zoom-stress":
      return (["maxInteractionMs", "maxFrameGapMs", "maxLongTaskMs"] as const).filter(
        (field) => !hasPositiveBudgetField(scenario.budget, field),
      );
    case "viewport-stability":
      return hasPositiveBudgetField(scenario.budget, "maxFrameGapMs")
        ? []
        : ["maxFrameGapMs"];
    case "control-change":
    case "control-drag":
    case "media-import":
      return (["maxInteractionMs", "maxFrameGapMs"] as const).filter(
        (field) => !hasPositiveBudgetField(scenario.budget, field),
      );
    case "export-copy":
      return hasPositiveBudgetField(scenario.budget, "maxExportMs") ? [] : ["maxExportMs"];
    case "preview-render":
      return hasPositiveBudgetField(scenario.budget, "maxPreviewMs") ||
        hasPositiveBudgetField(scenario.budget, "maxRenderMs")
        ? []
        : ["maxPreviewMs or maxRenderMs"];
    case "timeline-playback":
      return (["maxFrameGapMs", "maxLongTaskMs"] as const).filter(
        (field) => !hasPositiveBudgetField(scenario.budget, field),
      );
    case "timeline-scrub":
      return (["maxInteractionMs", "maxFrameGapMs", "maxLongTaskMs"] as const).filter(
        (field) => !hasPositiveBudgetField(scenario.budget, field),
      );
  }
}

export function getBudgetCapErrors(scenario: ToolcraftPerformanceScenario): string[] {
  return Object.entries(scenario.budget).flatMap(([field, value]) => {
    const budgetField = field as keyof ToolcraftPerformanceBudget;
    const cap = maxPerformanceBudgetCaps[budgetField];

    if (typeof value !== "number" || value <= cap) {
      return [];
    }

    return [`${scenario.id} ${budgetField} budget must be <= ${cap}ms, received ${value}ms.`];
  });
}
