import { expect, test } from "@playwright/test";
import type { Suite, TestCase } from "@playwright/test/reporter";

import {
  TOOLCRAFT_BROWSER_ACCEPTANCE_MARKER_TEST_NAME,
  TOOLCRAFT_BROWSER_PERFORMANCE_MARKER_TEST_NAME,
  TOOLCRAFT_BROWSER_RUNTIME_EVIDENCE_ATTACHMENT_NAME,
  TOOLCRAFT_BROWSER_RUNTIME_EVIDENCE_CONTENT_TYPE,
  type ToolcraftBrowserRuntimeRequirement,
} from "../src/app/test-evidence/browser-runtime-contract";
import ToolcraftBrowserRuntimeEvidenceReporter from "./browser-runtime-evidence-reporter";

const fakeRequirement: ToolcraftBrowserRuntimeRequirement = {
  evidenceType: "product-observable-change",
  requirementId: "appearance.opacity",
  testName: "browser: opacity changes product output",
};

function fakeTestCase({
  expectedStatus = "passed",
  file = "/product/e2e/app-controls.spec.ts",
  results = [],
  title,
}: {
  expectedStatus?: TestCase["expectedStatus"];
  file?: string;
  results?: TestCase["results"];
  title: string;
}): TestCase {
  return {
    expectedStatus,
    location: { column: 1, file, line: 1 },
    results,
    title,
  } as TestCase;
}

function fakeSuite(tests: TestCase[]): Suite {
  return { allTests: () => tests } as Suite;
}

function passedResultWithEvidence(
  requirement: ToolcraftBrowserRuntimeRequirement,
): TestCase["results"][number] {
  return {
    attachments: [
      {
        body: Buffer.from(
          JSON.stringify({
            evidenceType: requirement.evidenceType,
            requirementId: requirement.requirementId,
            ...(requirement.target === undefined
              ? {}
              : { target: requirement.target }),
            version: 2,
          }),
        ),
        contentType: TOOLCRAFT_BROWSER_RUNTIME_EVIDENCE_CONTENT_TYPE,
        name: TOOLCRAFT_BROWSER_RUNTIME_EVIDENCE_ATTACHMENT_NAME,
      },
    ],
    retry: 0,
    status: "passed",
  } as TestCase["results"][number];
}

test("runtime evidence reporter fails full runs with a missing required test", async () => {
  const errors: string[] = [];
  const reporter = new ToolcraftBrowserRuntimeEvidenceReporter({
    acceptanceRequirements: [fakeRequirement],
    reportError: (error) => errors.push(error),
  });
  const marker = fakeTestCase({
    file: "/product/e2e/app-browser-runtime-evidence.spec.ts",
    title: TOOLCRAFT_BROWSER_ACCEPTANCE_MARKER_TEST_NAME,
  });

  reporter.onBegin?.({} as never, fakeSuite([marker]));
  const status = await reporter.onEnd?.({ status: "passed" } as never);

  expect(status).toEqual({ status: "failed" });
  expect(errors).toContainEqual(
    expect.stringContaining(`Missing required browser test "${fakeRequirement.testName}"`),
  );
});

test("runtime evidence reporter limits marker-free runs to selected declared tests", async () => {
  const secondRequirement: ToolcraftBrowserRuntimeRequirement = {
    ...fakeRequirement,
    requirementId: "appearance.color",
    testName: "browser: color changes product output",
  };
  const selectedTest = fakeTestCase({
    results: [passedResultWithEvidence(fakeRequirement)],
    title: fakeRequirement.testName,
  });
  const reporter = new ToolcraftBrowserRuntimeEvidenceReporter({
    acceptanceRequirements: [fakeRequirement, secondRequirement],
    reportError: () => undefined,
  });
  const unprotectedMarkerTitle = fakeTestCase({
    title: TOOLCRAFT_BROWSER_ACCEPTANCE_MARKER_TEST_NAME,
  });

  reporter.onBegin?.(
    {} as never,
    fakeSuite([unprotectedMarkerTitle, selectedTest]),
  );
  const status = await reporter.onEnd?.({ status: "passed" } as never);

  expect(status).toBeUndefined();
});

test("runtime evidence reporter rejects unreachable evidence and runtime skips", () => {
  const candidates = [
    fakeTestCase({
      results: [
        { attachments: [], retry: 0, status: "passed" } as TestCase["results"][number],
      ],
      title: fakeRequirement.testName,
    }),
    fakeTestCase({
      expectedStatus: "skipped",
      results: [
        {
          ...passedResultWithEvidence(fakeRequirement),
          status: "skipped",
        } as TestCase["results"][number],
      ],
      title: fakeRequirement.testName,
    }),
  ];

  for (const candidate of candidates) {
    const reporter = new ToolcraftBrowserRuntimeEvidenceReporter({
      acceptanceRequirements: [fakeRequirement],
      reportError: () => undefined,
    });

    reporter.onBegin?.({} as never, fakeSuite([candidate]));
    expect(reporter.onEnd?.({ status: "passed" } as never)).toEqual({
      status: "failed",
    });
  }
});

test("performance marker requires every derived scenario evidence type", () => {
  const performanceRequirements: ToolcraftBrowserRuntimeRequirement[] = [
    {
      evidenceType: "performance-measurement",
      requirementId: "preview-heavy",
      testName: "browser perf: preview heavy",
    },
    {
      evidenceType: "performance-budget",
      requirementId: "preview-heavy",
      testName: "browser perf: preview heavy",
    },
  ];
  const marker = fakeTestCase({
    file: "/product/e2e/app-browser-runtime-evidence.spec.ts",
    title: TOOLCRAFT_BROWSER_PERFORMANCE_MARKER_TEST_NAME,
  });
  const scenarioTest = fakeTestCase({
    results: [passedResultWithEvidence(performanceRequirements[0]!)],
    title: "browser perf: preview heavy",
  });
  const errors: string[] = [];
  const reporter = new ToolcraftBrowserRuntimeEvidenceReporter({
    acceptanceRequirements: [],
    performanceRequirements,
    reportError: (error) => errors.push(error),
  });

  reporter.onBegin?.({} as never, fakeSuite([marker, scenarioTest]));
  expect(reporter.onEnd?.({ status: "passed" } as never)).toEqual({
    status: "failed",
  });
  expect(errors).toContainEqual(expect.stringContaining("performance-budget"));
});
