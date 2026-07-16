import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { evaluateToolcraftProductBoundary } from "./toolcraft-product-boundary.mjs";
import { createToolcraftProductBoundaryFixture as createFixture } from "./toolcraft-product-boundary-test-fixtures.mjs";
import { collectToolcraftFrameworkOwnedLocalPaths } from "./toolcraft-source-ownership.mjs";

const starterRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("protects every starter helper that writes reserved runtime evidence", async () => {
  const e2eRoot = path.join(starterRoot, "e2e");
  const helperPaths = (await fs.readdir(e2eRoot))
    .filter((fileName) => /\.[cm]?[jt]sx?$/u.test(fileName))
    .map((fileName) => `e2e/${fileName}`);
  const evidenceWriterPaths = [];

  for (const helperPath of helperPaths) {
    const source = await fs.readFile(path.join(starterRoot, helperPath), "utf8");
    if (/from\s+["']\.\/browser-runtime-evidence["']/u.test(source)) {
      evidenceWriterPaths.push(helperPath);
    }
  }

  const protectedPathSet = new Set(
    await collectToolcraftFrameworkOwnedLocalPaths(starterRoot),
  );
  assert.deepEqual(
    evidenceWriterPaths.filter((helperPath) => !protectedPathSet.has(helperPath)),
    [],
  );
});

test("rejects product tests that import or forge reserved runtime evidence", async (context) => {
  const rootDir = await createFixture(context, {
    "e2e/app-controls.spec.ts": `
      import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";
      export const loadHelper = (moduleName: string) => import(moduleName);
      const forgedName = "toolcraft.browser-runtime-evidence";
      const assembledName = "toolcraft.browser-runtime-" + "evidence";
      const assembledContentType =
        "application/vnd.toolcraft.browser-runtime-" + "evidence+json";
      void attachToolcraftBrowserRuntimeEvidence;
      void forgedName;
      void assembledName;
      void assembledContentType;
    `,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.deepEqual(
    result.violations.map((violation) => violation.kind),
    [
      "reserved-runtime-evidence",
      "non-static-module-specifier",
      "reserved-runtime-evidence",
      "reserved-runtime-evidence",
      "reserved-runtime-evidence",
    ],
  );
});

test("rejects reserved runtime evidence bridged through product production source", async (context) => {
  const rootDir = await createFixture(context, {
    "e2e/browser-runtime-evidence.ts": `
      export const attachToolcraftBrowserRuntimeEvidence = async () => {};
    `,
    "e2e/product.spec.ts": `
      import { attachToolcraftBrowserRuntimeEvidence } from "../src/product/evidence-bridge";
      void attachToolcraftBrowserRuntimeEvidence;
    `,
    "src/product/evidence-bridge.ts": `
      export { attachToolcraftBrowserRuntimeEvidence } from "../../e2e/browser-runtime-evidence";
    `,
  });

  const result = await evaluateToolcraftProductBoundary({
    protectedFilePaths: ["e2e/browser-runtime-evidence.ts"],
    rootDir,
  });

  assert.deepEqual(
    result.violations.map((violation) => violation.kind),
    ["production-test-import", "reserved-runtime-evidence"],
  );
});

test("rejects reserved runtime evidence payloads hidden in product production helpers", async (context) => {
  const rootDir = await createFixture(context, {
    "e2e/product.spec.ts": `
      import { evidenceName } from "../src/product/evidence-payload";
      void evidenceName;
    `,
    "src/product/evidence-payload.ts": `
      export const evidenceName = "toolcraft.browser-runtime-" + "evidence";
    `,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.deepEqual(
    result.violations.map((violation) => violation.kind),
    ["reserved-runtime-evidence"],
  );
});

test("rejects computed and non-static dynamic module loading", async (context) => {
  const rootDir = await createFixture(context, {
    "src/features/computed.ts": `
      const runtimeRoot = "@/toolcraft/runtime/";
      export const loadRuntime = () => import(runtimeRoot + "react");
    `,
    "src/features/non-static.ts": `
      export const loadModule = (moduleName: string) => import(moduleName);
    `,
    "src/features/shadowed-static.ts": `
      const moduleName = "@/toolcraft/runtime/react";
      export const loadModule = (moduleName: string) => import(moduleName);
    `,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.deepEqual(
    result.violations.map((violation) => violation.kind),
    [
      "runtime-surface",
      "non-static-module-specifier",
      "non-static-module-specifier",
    ],
  );
});
