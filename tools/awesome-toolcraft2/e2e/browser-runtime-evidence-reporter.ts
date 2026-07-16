import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
} from "@playwright/test/reporter";
import {
  TOOLCRAFT_BROWSER_ACCEPTANCE_MARKER_FILE_NAME,
  TOOLCRAFT_BROWSER_ACCEPTANCE_MARKER_TEST_NAME,
  TOOLCRAFT_BROWSER_PERFORMANCE_MARKER_TEST_NAME,
  evaluateToolcraftBrowserRuntimeEvidence,
  type ToolcraftBrowserRuntimeRequirement,
  type ToolcraftBrowserRuntimeTest,
} from "../src/app/test-evidence/browser-runtime-contract";
import { appAcceptance } from "../src/app/app-acceptance";
import { appPerformance } from "../src/app/app-performance";
import { appSchema } from "../src/app/app-schema";
import {
  deriveToolcraftBrowserRuntimeRequirements,
  deriveToolcraftPerformanceRuntimeRequirements,
} from "./browser-runtime-evidence-requirements";

type ToolcraftBrowserRuntimeEvidenceReporterOptions = {
  acceptanceRequirements?: readonly ToolcraftBrowserRuntimeRequirement[];
  performanceRequirements?: readonly ToolcraftBrowserRuntimeRequirement[];
  reportError?: (error: string) => void;
};

function isProtectedAcceptanceMarker(test: TestCase): boolean {
  const normalizedFile = test.location.file.replaceAll("\\", "/");

  return (
    test.title === TOOLCRAFT_BROWSER_ACCEPTANCE_MARKER_TEST_NAME &&
    normalizedFile.endsWith(
      `/e2e/${TOOLCRAFT_BROWSER_ACCEPTANCE_MARKER_FILE_NAME}`,
    )
  );
}

function isProtectedPerformanceMarker(test: TestCase): boolean {
  const normalizedFile = test.location.file.replaceAll("\\", "/");
  return (
    test.title === TOOLCRAFT_BROWSER_PERFORMANCE_MARKER_TEST_NAME &&
    normalizedFile.endsWith(
      `/e2e/${TOOLCRAFT_BROWSER_ACCEPTANCE_MARKER_FILE_NAME}`,
    )
  );
}

function toRuntimeTest(test: TestCase): ToolcraftBrowserRuntimeTest {
  return {
    expectedStatus: test.expectedStatus,
    results: test.results.map((result) => ({
      attachments: result.attachments,
      retry: result.retry,
      status: result.status,
    })),
    title: test.title,
  };
}

export default class ToolcraftBrowserRuntimeEvidenceReporter implements Reporter {
  private readonly acceptanceRequirementsOverride:
    | readonly ToolcraftBrowserRuntimeRequirement[]
    | undefined;

  private readonly reportError: (error: string) => void;
  private readonly performanceRequirementsOverride:
    | readonly ToolcraftBrowserRuntimeRequirement[]
    | undefined;

  private acceptanceRequirements: readonly ToolcraftBrowserRuntimeRequirement[] = [];

  private selectedTests: TestCase[] = [];
  private performanceRequirements: readonly ToolcraftBrowserRuntimeRequirement[] = [];

  private validateFullAcceptance = false;
  private validateFullPerformance = false;

  constructor(options: ToolcraftBrowserRuntimeEvidenceReporterOptions = {}) {
    this.acceptanceRequirementsOverride = options.acceptanceRequirements;
    this.performanceRequirementsOverride = options.performanceRequirements;
    this.reportError =
      options.reportError ??
      ((error) => console.error(`[toolcraft browser evidence] ${error}`));
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    this.selectedTests = suite.allTests();
    this.validateFullAcceptance = this.selectedTests.some(
      isProtectedAcceptanceMarker,
    );
    this.validateFullPerformance = this.selectedTests.some(
      isProtectedPerformanceMarker,
    );
    this.acceptanceRequirements =
      this.acceptanceRequirementsOverride ??
      deriveToolcraftBrowserRuntimeRequirements(appAcceptance, appSchema);
    this.performanceRequirements =
      this.performanceRequirementsOverride ??
      deriveToolcraftPerformanceRuntimeRequirements(appPerformance.scenarios);
  }

  onEnd(_result: FullResult): { status: "failed" } | undefined {
    const selectedTitles = new Set(this.selectedTests.map((test) => test.title));
    const acceptanceRequirements = this.validateFullAcceptance
      ? this.acceptanceRequirements
      : this.acceptanceRequirements.filter((requirement) =>
          selectedTitles.has(requirement.testName),
        );
    const performanceRequirements = this.validateFullPerformance
      ? this.performanceRequirements
      : this.performanceRequirements.filter((requirement) =>
          selectedTitles.has(requirement.testName),
        );
    const errors = evaluateToolcraftBrowserRuntimeEvidence({
      requirements: [...acceptanceRequirements, ...performanceRequirements],
      tests: this.selectedTests.map(toRuntimeTest),
    });

    if (errors.length === 0) {
      return undefined;
    }

    for (const error of errors) {
      this.reportError(error);
    }

    return { status: "failed" };
  }

  printsToStdio(): boolean {
    return false;
  }
}
