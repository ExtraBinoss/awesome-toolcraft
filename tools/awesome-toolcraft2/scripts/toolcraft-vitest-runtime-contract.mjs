export const TOOLCRAFT_VITEST_RUNTIME_EVIDENCE_VERSION = 1;
export const TOOLCRAFT_VITEST_RUNTIME_REQUIREMENTS_ANNOTATION_TYPE =
  "toolcraft.automated-runtime-requirements";
export const TOOLCRAFT_VITEST_RUNTIME_MARKER_TEST_NAME =
  "toolcraft: validate complete automated runtime coverage";
export const TOOLCRAFT_VITEST_RUNTIME_MARKER_FILE_NAMES = Object.freeze([
  "starter-automated-runtime-evidence.test.ts",
  "app-automated-runtime-evidence.test.ts",
]);

export function serializeToolcraftVitestRuntimeRequirements(requirements) {
  return JSON.stringify({
    requirements,
    version: TOOLCRAFT_VITEST_RUNTIME_EVIDENCE_VERSION,
  });
}

export function parseToolcraftVitestRuntimeRequirements(annotation) {
  if (
    !annotation ||
    annotation.type !== TOOLCRAFT_VITEST_RUNTIME_REQUIREMENTS_ANNOTATION_TYPE
  ) {
    return undefined;
  }

  try {
    const payload = JSON.parse(annotation.message);
    if (
      payload?.version !== TOOLCRAFT_VITEST_RUNTIME_EVIDENCE_VERSION ||
      !Array.isArray(payload.requirements) ||
      payload.requirements.some(
        (requirement) =>
          !requirement ||
          !["acceptance", "performance"].includes(requirement.kind) ||
          typeof requirement.requirementId !== "string" ||
          !requirement.requirementId.trim() ||
          typeof requirement.testName !== "string" ||
          !requirement.testName.trim(),
      )
    ) {
      return undefined;
    }

    return payload.requirements;
  } catch {
    return undefined;
  }
}

export function evaluateToolcraftVitestRuntimeEvidence({ requirements, tests }) {
  const errors = [];

  for (const requirement of requirements) {
    const matchingTests = tests.filter(
      (test) =>
        test.owner === "product" && test.name === requirement.testName,
    );

    if (matchingTests.length === 0) {
      errors.push(
        `Missing required automated test "${requirement.testName}" for ${requirement.kind} requirement "${requirement.requirementId}".`,
      );
      continue;
    }

    if (matchingTests.length > 1) {
      errors.push(
        `Duplicate required automated test "${requirement.testName}" for ${requirement.kind} requirement "${requirement.requirementId}". Each requirement needs one product-owned test.`,
      );
      continue;
    }

    const [test] = matchingTests;
    if (test.expectedFailure) {
      errors.push(
        `Required automated test "${requirement.testName}" must not use expected-failure mode in ${test.filePath}.`,
      );
      continue;
    }
    if (test.state !== "passed") {
      errors.push(
        `Required automated test "${requirement.testName}" must finish with status "passed"; received "${test.state}" in ${test.filePath}.`,
      );
    }
  }

  return errors;
}
