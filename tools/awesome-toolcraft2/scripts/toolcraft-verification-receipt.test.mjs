import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  collectToolcraftVerificationInputs,
  getToolcraftPerformanceExemptionBlockedFiles,
  getToolcraftPerformanceReceiptPath,
  validateToolcraftPerformanceReceipt,
  writeToolcraftPerformanceExemption,
} from "./toolcraft-verification-receipt.mjs";
import * as receiptModule from "./toolcraft-verification-receipt.mjs";

async function createFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "toolcraft-receipt-"));
  await fs.mkdir(path.join(rootDir, "src", "app"), { recursive: true });
  await fs.mkdir(path.join(rootDir, "e2e"), { recursive: true });
  await fs.writeFile(
    path.join(rootDir, "src", "app", "app-schema.ts"),
    'export const schema = { mode: "initial" };\n',
  );
  await fs.writeFile(
    path.join(rootDir, "e2e", "app-performance.spec.ts"),
    'export const scenario = "heavy";\n',
  );
  await fs.writeFile(
    path.join(rootDir, "package.json"),
    JSON.stringify({ name: "receipt-fixture", private: true }),
  );
  return rootDir;
}

async function writePassedCheckpointFixture(
  rootDir,
  { runner = "playwright-fallback" } = {},
) {
  const inventory = await collectToolcraftVerificationInputs(rootDir);
  const receiptPath = getToolcraftPerformanceReceiptPath(rootDir);
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(
    receiptPath,
    `${JSON.stringify(
      {
        completedAt: new Date().toISOString(),
        files: inventory.entries,
        kind: "performance-checkpoint",
        runner,
        sourceHash: inventory.sourceHash,
        status: "passed",
        version: TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
      },
      null,
      2,
    )}\n`,
  );
}

test("does not expose a reusable passed-checkpoint writer", () => {
  assert.equal("writeToolcraftPerformanceReceipt" in receiptModule, false);
});

test("rejects verification inputs that change during a protected checkpoint", () => {
  const assertStable = receiptModule.assertToolcraftVerificationInputsUnchanged;
  assert.equal(typeof assertStable, "function");
  assert.doesNotThrow(() =>
    assertStable({
      baseline: { entries: [], sourceHash: "same" },
      current: { entries: [], sourceHash: "same" },
      phase: "after build",
    }),
  );
  assert.throws(
    () =>
      assertStable({
        baseline: { entries: [], sourceHash: "before" },
        current: { entries: [], sourceHash: "after" },
        phase: "after Playwright",
      }),
    /verification inputs changed.*after Playwright/iu,
  );
});

test("classifies obvious Tier 3 and Tier 4 paths without blocking ordinary Tier 0-2 files", () => {
  assert.deepEqual(
    getToolcraftPerformanceExemptionBlockedFiles([
      "src/app/app-schema.ts",
      "src/app/app-acceptance-data.ts",
      "src/app/app-schema.test.ts",
      "src/product/control-mapping.ts",
      "e2e/app-controls.spec.ts",
      "src/styles/panel.module.css",
      "package-lock.json",
      "public/source.png",
      "scripts/check.mjs",
      "src/toolcraft/runtime.ts",
      "src/app/app-composition.tsx",
      "src/app/app-performance.ts",
      "src/product/product-output.ts",
      "src/product/renderer.ts",
      "src/product/canvas-worker.ts",
      "src/product/viewport.ts",
    ]),
    [
      "package-lock.json",
      "public/source.png",
      "scripts/check.mjs",
      "src/app/app-composition.tsx",
      "src/app/app-performance.ts",
      "src/product/canvas-worker.ts",
      "src/product/product-output.ts",
      "src/product/renderer.ts",
      "src/product/viewport.ts",
      "src/toolcraft/runtime.ts",
    ],
  );
});

test("requires a structured receipt instead of prose-only performance claims", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  await fs.mkdir(path.join(rootDir, "docs", "toolcraft"), { recursive: true });
  await fs.writeFile(
    path.join(rootDir, "docs", "toolcraft", "agent-worklog.md"),
    "- Run: pnpm verify:perf passed\n",
  );

  const errors = await validateToolcraftPerformanceReceipt({ rootDir });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /performance receipt is missing/iu);
});

test("accepts a passed receipt only while its source inventory is current", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  await writePassedCheckpointFixture(rootDir);

  assert.deepEqual(await validateToolcraftPerformanceReceipt({ rootDir }), []);

  await fs.writeFile(
    path.join(rootDir, "src", "app", "app-schema.ts"),
    'export const schema = { mode: "changed" };\n',
  );
  const staleErrors = await validateToolcraftPerformanceReceipt({ rootDir });
  assert.equal(staleErrors.length, 1);
  assert.match(staleErrors[0], /stale/iu);
});

test("rejects manual agent-browser receipts without automated runner proof", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  await writePassedCheckpointFixture(rootDir, { runner: "agent-browser" });

  assert.match(
    (await validateToolcraftPerformanceReceipt({ rootDir }))[0],
    /supported runner/iu,
  );
});

test("rejects a receipt whose file inventory does not produce its source hash", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  const inventory = await collectToolcraftVerificationInputs(rootDir);
  const receiptPath = getToolcraftPerformanceReceiptPath(rootDir);
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(
    receiptPath,
    `${JSON.stringify(
      {
        completedAt: new Date().toISOString(),
        files: [],
        kind: "performance-checkpoint",
        runner: "playwright-fallback",
        sourceHash: inventory.sourceHash,
        status: "passed",
        version: TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
      },
      null,
      2,
    )}\n`,
  );

  assert.match(
    (await validateToolcraftPerformanceReceipt({ rootDir }))[0],
    /file inventory.*source hash/iu,
  );
});

test("invalidates a checkpoint when the npm dependency graph changes", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  const packageLockPath = path.join(rootDir, "package-lock.json");
  await fs.writeFile(
    packageLockPath,
    JSON.stringify({ lockfileVersion: 3, packages: {} }),
  );
  await writePassedCheckpointFixture(rootDir);

  await fs.writeFile(
    packageLockPath,
    JSON.stringify({
      lockfileVersion: 3,
      packages: { "node_modules/example": { version: "2.0.0" } },
    }),
  );

  assert.match(
    (await validateToolcraftPerformanceReceipt({ rootDir }))[0],
    /stale/iu,
  );
});

test("rejects malformed and non-passed receipts", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  const receiptPath = getToolcraftPerformanceReceiptPath(rootDir);
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, "not json");
  const malformedErrors = await validateToolcraftPerformanceReceipt({ rootDir });
  assert.equal(malformedErrors.length, 1);
  assert.match(malformedErrors[0], /malformed/iu);

  await fs.writeFile(
    receiptPath,
    JSON.stringify({
      kind: "performance-checkpoint",
      files: [],
      runner: "playwright-fallback",
      sourceHash: "invalid",
      status: "failed",
      version: 1,
    }),
  );
  const failedErrors = await validateToolcraftPerformanceReceipt({ rootDir });
  assert.equal(failedErrors.length, 1);
  assert.match(failedErrors[0], /passed/iu);
});

test("permits only a current typed post-first-working exemption backed by a prior pass", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  await writePassedCheckpointFixture(rootDir);
  await fs.writeFile(
    path.join(rootDir, "src", "app", "app-schema.ts"),
    'export const schema = { mode: "non-performance-feature" };\n',
  );
  await writeToolcraftPerformanceExemption({
    reasonCode: "post-first-working-non-performance",
    rootDir,
    verificationTier: 2,
  });

  assert.deepEqual(await validateToolcraftPerformanceReceipt({ rootDir }), []);

  await fs.writeFile(
    path.join(rootDir, "e2e", "app-performance.spec.ts"),
    'export const scenario = "changed-after-exemption";\n',
  );
  const staleErrors = await validateToolcraftPerformanceReceipt({ rootDir });
  assert.equal(staleErrors.length, 1);
  assert.match(staleErrors[0], /stale/iu);
});

test("rejects exemptions for obvious Tier 3 renderer changes", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  const rendererPath = path.join(rootDir, "src", "product-renderer.ts");
  await fs.writeFile(rendererPath, "export const render = () => 1;\n");
  await writePassedCheckpointFixture(rootDir);
  await fs.writeFile(rendererPath, "export const render = () => 2;\n");

  await assert.rejects(
    writeToolcraftPerformanceExemption({
      reasonCode: "post-first-working-non-performance",
      rootDir,
      verificationTier: 2,
    }),
    /product-renderer\.ts.*pnpm verify:perf/iu,
  );
});
