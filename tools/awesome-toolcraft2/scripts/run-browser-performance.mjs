#!/usr/bin/env node

import { access, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import spawn from "cross-spawn";

import {
  TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  assertToolcraftVerificationInputsUnchanged,
  clearToolcraftPerformanceReceipt,
  collectToolcraftVerificationInputs,
  getToolcraftPerformanceReceiptPath,
} from "./toolcraft-verification-receipt.mjs";

const projectDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const [, , ...requestedArguments] = process.argv;
const unsupportedArguments = requestedArguments.filter(
  (argument) => argument !== "--",
);
if (unsupportedArguments.length > 0) {
  throw new Error(
    `Toolcraft protected performance checkpoints do not accept Playwright arguments: ${unsupportedArguments.join(" ")}. Run Playwright directly for targeted diagnosis.`,
  );
}

function getBinaryPath(name) {
  return path.join(
    projectDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? `${name}.cmd` : name,
  );
}

const playwrightBin = getBinaryPath("playwright");
const tscBin = getBinaryPath("tsc");
const viteBin = getBinaryPath("vite");

const baselineInventory = await collectToolcraftVerificationInputs(projectDir);
await clearToolcraftPerformanceReceipt(projectDir);

await Promise.all([playwrightBin, tscBin, viteBin].map((filePath) => access(filePath)));

function runBinary(binaryPath, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, { env, stdio: "inherit" });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${path.basename(binaryPath)} exited after signal ${signal}.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${path.basename(binaryPath)} exited with code ${code ?? 1}.`));
        return;
      }
      resolve();
    });
  });
}

async function writeToolcraftPerformanceCheckpointReceipt(inventory) {
  const receiptPath = getToolcraftPerformanceReceiptPath(projectDir);
  const temporaryPath = `${receiptPath}.${process.pid}.tmp`;
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(
    temporaryPath,
    `${JSON.stringify(
      {
        completedAt: new Date().toISOString(),
        files: inventory.entries,
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
  await rename(temporaryPath, receiptPath);
}

await runBinary(tscBin, ["-p", "tsconfig.json", "--noEmit"]);
await runBinary(viteBin, ["build"]);
assertToolcraftVerificationInputsUnchanged({
  baseline: baselineInventory,
  current: await collectToolcraftVerificationInputs(projectDir),
  phase: "during the production build",
});
await runBinary(playwrightBin, ["install", "chromium"]);
await runBinary(
  playwrightBin,
  [
    "test",
    "--grep",
    "browser perf:",
    "--workers=1",
  ],
  {
    ...process.env,
    TOOLCRAFT_BROWSER_SERVER_MODE: "preview",
  },
);
const verifiedInventory = await collectToolcraftVerificationInputs(projectDir);
assertToolcraftVerificationInputsUnchanged({
  baseline: baselineInventory,
  current: verifiedInventory,
  phase: "during Playwright",
});
await writeToolcraftPerformanceCheckpointReceipt(verifiedInventory);
