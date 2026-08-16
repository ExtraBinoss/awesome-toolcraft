import { describe, expect, it } from "vitest";

import { appSchema } from "@/tools/gradient-generator/app-schema";
import {
  collectToolcraftPerformanceSensitiveControls,
  collectToolcraftUnclassifiedPerformanceControls,
  defaultToolcraftBrowserCheckPolicy,
  defineToolcraftPerformance,
  getToolcraftControlPerformanceValues,
  getToolcraftSchemaPerformanceValues,
  requireToolcraftSchemaPerformanceValues,
  validateToolcraftPerformanceCoverage,
} from "./performance";
import type { ToolcraftPerformanceConfig } from "./performance-types";

const performanceConfig: ToolcraftPerformanceConfig = {
  rendererStrategy: "canvas-2d",
  rendererWorkload: "pixel-output",
  scenarios: [],
  usesCustomRenderer: true,
  workloadTargets: [],
};

describe("performance runtime API", () => {
  it("keeps the barrel exports wired to their implementations", () => {
    const configured = defineToolcraftPerformance(performanceConfig);
    const seedControl = appSchema.panels.controls?.sections
      .flatMap((section) => Object.values(section.controls))
      .find((control) => control.target === "gradient.seed");

    expect(defaultToolcraftBrowserCheckPolicy.preferredRunner).toBe("agent-browser");
    expect(configured.browserCheckPolicy).toEqual(defaultToolcraftBrowserCheckPolicy);
    expect(collectToolcraftPerformanceSensitiveControls(appSchema)).toEqual(
      expect.any(Array),
    );
    expect(collectToolcraftUnclassifiedPerformanceControls(appSchema)).toEqual(
      expect.any(Array),
    );
    expect(getToolcraftControlPerformanceValues(seedControl)).toEqual({
      default: 37,
      max: 100,
      min: 1,
    });
    expect(getToolcraftSchemaPerformanceValues(appSchema, "gradient.seed")).toEqual({
      default: 37,
      max: 100,
      min: 1,
    });
    expect(requireToolcraftSchemaPerformanceValues(appSchema, "gradient.seed")).toEqual({
      default: 37,
      max: 100,
      min: 1,
    });
    expect(validateToolcraftPerformanceCoverage(appSchema, configured)).toEqual(
      expect.any(Array),
    );
  });
});
