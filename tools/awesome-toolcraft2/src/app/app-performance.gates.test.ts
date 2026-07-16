import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import {
  collectToolcraftUnclassifiedPerformanceControls,
  validateToolcraftPerformanceCoverage,
} from "@/toolcraft/runtime";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import {
  e2eDir,
  playwrightConfigForbidsFocusedTests,
  projectDir,
} from "./app-performance-test-utils";

describe("Toolcraft starter performance gates", () => {
  it("publishes separate browser acceptance and performance fallback gates", () => {
    const packageJson = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const generatedAppTestScript =
      packageJson.scripts?.["test:generated"] ?? packageJson.scripts?.test;
    const runScriptPattern = (scriptName: string) =>
      `(?:pnpm ${scriptName}|npm run ${scriptName})`;

    expect(
      generatedAppTestScript,
      "Generated app tests must invoke the Toolcraft integrity checker.",
    ).toContain("node scripts/check-toolcraft-integrity.mjs");

    expect(
      packageJson.scripts?.["test:browser"],
      "Generated apps must keep full performance scenarios out of the default browser acceptance gate.",
    ).toBe('playwright install chromium && playwright test --grep-invert "browser perf:"');
    expect(
      packageJson.scripts?.["test:browser:perf"],
      "Generated apps must expose a protected sequential Playwright checkpoint for final performance proof.",
    ).toBe("node scripts/run-browser-performance.mjs");
    const performanceRunner = readFileSync(
      join(projectDir, "scripts/run-browser-performance.mjs"),
      "utf8",
    );
    const receiptModule = readFileSync(
      join(projectDir, "scripts/toolcraft-verification-receipt.mjs"),
      "utf8",
    );
    expect(performanceRunner).toContain('runBinary(viteBin, ["build"])');
    expect(performanceRunner).toContain('TOOLCRAFT_BROWSER_SERVER_MODE: "preview"');
    expect(performanceRunner).toContain('"--workers=1"');
    expect(performanceRunner).not.toContain('"--pass-with-no-tests"');
    expect(performanceRunner).not.toContain("process.argv.slice(2)");
    expect(performanceRunner).toContain(
      "assertToolcraftVerificationInputsUnchanged",
    );
    expect(performanceRunner).toContain("clearToolcraftPerformanceReceipt");
    expect(performanceRunner).toContain("writeToolcraftPerformanceCheckpointReceipt");
    expect(receiptModule).not.toContain(
      "export async function writeToolcraftPerformanceReceipt",
    );
    expect(packageJson.scripts?.["verify:quick"]).toMatch(
      new RegExp(`^${runScriptPattern("ai:check")} && ${runScriptPattern("test")}$`),
    );
    expect(packageJson.scripts?.["verify:ui"]).toMatch(
      new RegExp(`^${runScriptPattern("test:browser")}$`),
    );
    expect(packageJson.scripts?.["verify:perf"]).toMatch(
      new RegExp(`^${runScriptPattern("test:browser:perf")}$`),
    );
    expect(packageJson.scripts?.["verify:perf:playwright"]).toMatch(
      new RegExp(`^${runScriptPattern("test:browser:perf")}$`),
    );
    expect(
      packageJson.scripts?.["verify:perf:record-agent-browser"],
      "A terminal-only command must not mint an agent-browser performance receipt without browser evidence.",
    ).toBeUndefined();
    expect(packageJson.scripts?.["verify:perf:record-exemption"]).toContain(
      "record-exemption",
    );
    expect(packageJson.scripts?.["verify:receipt"]).toContain("validate");
    expect(packageJson.scripts?.["verify:final"]).toMatch(
      new RegExp(
        `^${runScriptPattern("ai:check")} && ${runScriptPattern("test")} && ${runScriptPattern("build")} && ${runScriptPattern("test:browser")} && ${runScriptPattern("verify:receipt")}$`,
      ),
    );
  });

  it("keeps the Playwright performance audit inside the browser perf tag", () => {
    const source = readFileSync(join(e2eDir, "app-performance.spec.ts"), "utf8");
    const testNames = [...source.matchAll(/test\(\s*(["'`])([^"'`]+)\1/g)].map(
      (match) => match[2],
    );

    expect(source).not.toContain("TOOLCRAFT_PERF_CHECK");
    expect(testNames.length).toBeGreaterThan(0);
    expect(
      testNames.every((name) => name.includes("browser perf:")),
      `app-performance.spec.ts tests must all be tagged for the dedicated perf checkpoint: ${testNames.join(", ")}`,
    ).toBe(true);
  });

  it("rejects focused Playwright tests that would bypass protected browser gates", () => {
    expect(playwrightConfigForbidsFocusedTests()).toBe(true);
  });

  it("declares agent browser as the preferred performance runner", () => {
    expect(appPerformance.browserCheckPolicy).toEqual({
      fallbackRunner: "playwright",
      fallbackWhen: ["agent-browser-unavailable", "ci"],
      preferredRunner: "agent-browser",
    });
  });

  it("requires valid performance coverage for declared workload scenarios", () => {
    expect(validateToolcraftPerformanceCoverage(appSchema, appPerformance)).toEqual([]);
  });

  it("requires every visible control to classify its performance role", () => {
    const unclassifiedControls =
      collectToolcraftUnclassifiedPerformanceControls(appSchema);

    expect(
      unclassifiedControls,
      "Every visible non-action control must declare performanceRole as workload or responsiveness so AI cannot skip the performance decision.",
    ).toEqual([]);
  });
});
