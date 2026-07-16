import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  TOOLCRAFT_VITEST_RUNTIME_MARKER_TEST_NAME,
  TOOLCRAFT_VITEST_RUNTIME_REQUIREMENTS_ANNOTATION_TYPE,
  serializeToolcraftVitestRuntimeRequirements,
} from "./toolcraft-vitest-runtime-contract.mjs";
import ToolcraftVitestRuntimeEvidenceReporter, {
  findToolcraftVitestRuntimeMarker,
} from "./toolcraft-vitest-runtime-evidence-reporter.mjs";

function createTestTask({
  annotations = [],
  expectedFailure = false,
  filePath,
  name,
  state = "passed",
}) {
  return {
    annotations: () => annotations,
    module: { moduleId: filePath },
    name,
    options: { fails: expectedFailure },
    result: () => ({ state }),
  };
}

function createTestModule(tests) {
  return {
    children: {
      allTests: () => tests,
    },
  };
}

test("recognizes both starter and generated marker filenames", () => {
  for (const fileName of [
    "starter-automated-runtime-evidence.test.ts",
    "app-automated-runtime-evidence.test.ts",
  ]) {
    const marker = createTestTask({
      filePath: `/workspace/src/app/${fileName}`,
      name: TOOLCRAFT_VITEST_RUNTIME_MARKER_TEST_NAME,
    });
    assert.equal(findToolcraftVitestRuntimeMarker([marker]).marker, marker);
  }
});

test("rejects a missing or duplicated protected marker", () => {
  assert.throws(
    () => findToolcraftVitestRuntimeMarker([]),
    /marker was not executed/u,
  );
  const marker = createTestTask({
    filePath: "/workspace/src/app/app-automated-runtime-evidence.test.ts",
    name: TOOLCRAFT_VITEST_RUNTIME_MARKER_TEST_NAME,
  });
  assert.throws(
    () => findToolcraftVitestRuntimeMarker([marker, marker]),
    /exactly once/u,
  );
});

test("validates generated-app requirements from actual runner tasks", async (context) => {
  const appRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "toolcraft-vitest-reporter-"),
  );
  context.after(() => fs.rm(appRoot, { force: true, recursive: true }));
  const markerPath = path.join(
    appRoot,
    "src/app/app-automated-runtime-evidence.test.ts",
  );
  const productTestPath = path.join(appRoot, "src/app/app-schema.test.ts");
  await fs.mkdir(path.dirname(markerPath), { recursive: true });
  await fs.mkdir(path.join(appRoot, "src/toolcraft"), { recursive: true });
  await fs.writeFile(
    path.join(appRoot, "src/toolcraft/.toolcraft-manifest.json"),
    JSON.stringify({
      protectedFiles: {
        "src/app/app-automated-runtime-evidence.test.ts": "digest",
      },
    }),
  );
  const requirement = {
    kind: "acceptance",
    requirementId: "appearance.opacity",
    testName: "opacity changes product output",
  };
  const marker = createTestTask({
    annotations: [
      {
        message: serializeToolcraftVitestRuntimeRequirements([requirement]),
        type: TOOLCRAFT_VITEST_RUNTIME_REQUIREMENTS_ANNOTATION_TYPE,
      },
    ],
    filePath: markerPath,
    name: TOOLCRAFT_VITEST_RUNTIME_MARKER_TEST_NAME,
  });
  const productTest = createTestTask({
    filePath: productTestPath,
    name: requirement.testName,
  });

  await new ToolcraftVitestRuntimeEvidenceReporter().onTestRunEnd([
    createTestModule([marker, productTest]),
  ]);
});
