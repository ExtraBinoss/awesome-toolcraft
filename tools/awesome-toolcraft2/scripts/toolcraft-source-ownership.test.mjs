import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  collectToolcraftFrameworkOwnedGeneratedPaths,
  collectToolcraftFrameworkOwnedLocalPaths,
  isToolcraftFrameworkOwnedPath,
  toToolcraftGeneratedPath,
  toolcraftFrameworkOwnedRootFiles,
  toolcraftProductOwnedGeneratedPaths,
} from "./toolcraft-source-ownership.mjs";
import { requiredProtectedTrustRootFilePaths } from "./toolcraft-integrity-policy.mjs";

const starterRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("maps starter facade names to generated paths", () => {
  assert.equal(
    toToolcraftGeneratedPath("src/app/app-composition.tsx"),
    "src/app/app-composition.tsx",
  );
  assert.equal(
    toToolcraftGeneratedPath("src/app/acceptance/validation-pipeline.ts"),
    "src/app/acceptance/validation-pipeline.ts",
  );
});

test("classifies framework infrastructure and product extension points", () => {
  assert.equal(
    isToolcraftFrameworkOwnedPath("src/app/acceptance/actions.ts"),
    true,
  );
  assert.equal(
    isToolcraftFrameworkOwnedPath("src/app/app-composition.tsx"),
    false,
  );
  assert.equal(
    isToolcraftFrameworkOwnedPath("src/app/app-composition.tsx"),
    false,
  );
  assert.equal(isToolcraftFrameworkOwnedPath("src/features/product.ts"), false);
});

test("collects the same ownership policy for starter-local and generated paths", async () => {
  const localPaths = await collectToolcraftFrameworkOwnedLocalPaths(starterRoot);
  const generatedPaths =
    await collectToolcraftFrameworkOwnedGeneratedPaths(starterRoot);

  assert.deepEqual(
    generatedPaths,
    [...new Set(localPaths.map(toToolcraftGeneratedPath))].sort(),
  );
  assert.ok(localPaths.includes("src/app/acceptance/actions.ts"));
  assert.equal(
    localPaths.filter(
      (relativePath) =>
        toToolcraftGeneratedPath(relativePath) ===
        "src/app/app-automated-runtime-evidence.test.ts",
    ).length,
    1,
  );
  assert.ok(!localPaths.includes("src/app/app-composition.tsx"));

  for (const relativePath of toolcraftFrameworkOwnedRootFiles) {
    assert.ok(localPaths.includes(relativePath));
  }
  for (const relativePath of toolcraftProductOwnedGeneratedPaths) {
    assert.ok(!generatedPaths.includes(relativePath));
  }
});

test("keeps the signed-manifest trust root small and inside canonical ownership", async () => {
  const generatedPaths =
    await collectToolcraftFrameworkOwnedGeneratedPaths(starterRoot);
  const generatedPathSet = new Set(generatedPaths);

  assert.ok(requiredProtectedTrustRootFilePaths.length > 0);
  assert.ok(
    requiredProtectedTrustRootFilePaths.length <= 24,
    `The trust root must stay small; received ${requiredProtectedTrustRootFilePaths.length} paths.`,
  );
  assert.equal(
    new Set(requiredProtectedTrustRootFilePaths).size,
    requiredProtectedTrustRootFilePaths.length,
  );
  for (const relativePath of requiredProtectedTrustRootFilePaths) {
    assert.ok(
      generatedPathSet.has(relativePath),
      `Trust-root path must be framework-owned: ${relativePath}`,
    );
  }

  const subsystemSentinels = [
    "AGENTS.md",
    "e2e/browser-runtime-evidence-reporter.ts",
    "scripts/check-toolcraft-integrity.mjs",
    "scripts/toolcraft-integrity-policy.mjs",
    "scripts/toolcraft-source-ownership.mjs",
    "scripts/toolcraft-vitest-runtime-evidence-reporter.mjs",
    "scripts/toolcraft-workflow-routes.mjs",
    "src/app/app-automated-runtime-evidence.test.ts",
  ];
  for (const relativePath of subsystemSentinels) {
    assert.ok(
      requiredProtectedTrustRootFilePaths.includes(relativePath),
      `Trust root must retain the ${relativePath} sentinel.`,
    );
  }
});
