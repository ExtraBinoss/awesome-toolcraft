import type {
  ToolcraftBrowserCheckFallbackCondition,
  ToolcraftBrowserCheckFallbackRunner,
  ToolcraftBrowserCheckPolicy,
  ToolcraftBrowserCheckPreferredRunner,
  ToolcraftPerformanceConfig,
} from "./performance-types";

export const defaultToolcraftBrowserCheckPolicy: ToolcraftBrowserCheckPolicy = {
  fallbackRunner: "playwright",
  fallbackWhen: ["agent-browser-unavailable", "ci"],
  preferredRunner: "agent-browser",
};

export function defineToolcraftPerformance(
  config: ToolcraftPerformanceConfig,
): ToolcraftPerformanceConfig & { browserCheckPolicy: ToolcraftBrowserCheckPolicy } {
  return {
    ...config,
    browserCheckPolicy: {
      ...defaultToolcraftBrowserCheckPolicy,
      ...config.browserCheckPolicy,
      fallbackWhen:
        config.browserCheckPolicy?.fallbackWhen ??
        defaultToolcraftBrowserCheckPolicy.fallbackWhen,
    },
  };
}

const browserCheckPreferredRunners = new Set<ToolcraftBrowserCheckPreferredRunner>([
  "agent-browser",
]);

const browserCheckFallbackRunners = new Set<ToolcraftBrowserCheckFallbackRunner>([
  "playwright",
]);

const browserCheckFallbackConditions = new Set<ToolcraftBrowserCheckFallbackCondition>([
  "agent-browser-unavailable",
  "ci",
]);

export function getBrowserCheckPolicyErrors(config: ToolcraftPerformanceConfig): string[] {
  const errors: string[] = [];
  const policy = config.browserCheckPolicy ?? defaultToolcraftBrowserCheckPolicy;
  const fallbackWhen = policy.fallbackWhen as unknown;

  if (
    !browserCheckPreferredRunners.has(
      policy.preferredRunner as ToolcraftBrowserCheckPreferredRunner,
    )
  ) {
    errors.push(
      'browserCheckPolicy.preferredRunner must be "agent-browser" so AI agents use their controlled browser before fallback automation.',
    );
  }

  if (
    !browserCheckFallbackRunners.has(
      policy.fallbackRunner as ToolcraftBrowserCheckFallbackRunner,
    )
  ) {
    errors.push(
      'browserCheckPolicy.fallbackRunner must be "playwright" so generated apps keep a portable CI/non-agent fallback.',
    );
  }

  if (!Array.isArray(fallbackWhen)) {
    errors.push(
      'browserCheckPolicy.fallbackWhen must include "agent-browser-unavailable" and "ci".',
    );
    return errors;
  }

  for (const condition of fallbackWhen) {
    if (
      !browserCheckFallbackConditions.has(
        condition as ToolcraftBrowserCheckFallbackCondition,
      )
    ) {
      errors.push(
        `browserCheckPolicy.fallbackWhen contains unsupported condition "${String(
          condition,
        )}".`,
      );
    }
  }

  if (!fallbackWhen.includes("agent-browser-unavailable")) {
    errors.push(
      'browserCheckPolicy.fallbackWhen must include "agent-browser-unavailable" so Playwright is only used when no agent browser exists.',
    );
  }

  if (!fallbackWhen.includes("ci")) {
    errors.push(
      'browserCheckPolicy.fallbackWhen must include "ci" so CI/non-agent automation has a portable performance runner.',
    );
  }

  return errors;
}
