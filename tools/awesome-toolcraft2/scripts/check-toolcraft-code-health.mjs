#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  codeHealthPassed,
  evaluateCodeHealth,
  printCodeHealthResult,
} from "./toolcraft-code-health-core.mjs";
import { loadToolcraftLocalModuleAliases } from "./toolcraft-product-dependency-graph.mjs";
import { collectToolcraftFrameworkOwnedLocalPaths } from "./toolcraft-source-ownership.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const appRoot = path.resolve(path.dirname(scriptPath), "..");

const generatedCodeHealthPolicy = {
  globalLineBudget: {
    maxLines: 1000,
    reason: "Generated product source must not become a giant mixed-responsibility module.",
  },
  ignoredFilePatterns: [
    /^src\/toolcraft(?:\/|$)/u,
    /\/route-tree\.gen\.ts$/u,
  ],
  scopedLineBudgets: [
    {
      maxLines: 700,
      prefix: "src/app/",
      reason:
        "Generated app modules should split schema, renderer, exports, and product behavior before they become one policy dump.",
    },
    {
      maxLines: 400,
      prefix: "src/routes/",
      reason: "Generated routes should remain thin Toolcraft composition boundaries.",
    },
    {
      maxLines: 700,
      prefix: "src/",
      reason:
        "Generated product modules should split rendering, state, and behavior before they become mixed-responsibility files.",
    },
    {
      maxLines: 500,
      prefix: "e2e/",
      reason: "Generated browser tests should stay split by behavior and evidence role.",
    },
    {
      maxLines: 350,
      prefix: "scripts/",
      reason: "Generated operational scripts should stay focused and independently testable.",
    },
  ],
  sourceRoots: ["src", "e2e", "scripts"],
  testLineBudget: {
    maxLines: 500,
    reason: "Generated test/spec files should stay focused instead of becoming behavior dumps.",
  },
};

export async function evaluateGeneratedCodeHealth(rootDir = appRoot) {
  const [dependencyCycleAliases, frameworkOwnedLocalPaths] = await Promise.all([
    loadToolcraftLocalModuleAliases({
      rootDir,
      tsconfigPaths: ["tsconfig.json"],
    }),
    collectToolcraftFrameworkOwnedLocalPaths(rootDir),
  ]);
  return evaluateCodeHealth({
    ...generatedCodeHealthPolicy,
    dependencyCycleAliases,
    dependencyCycleIncludedFilePatterns: [/^src\//u],
    frameworkPathPrefixes: ["src/toolcraft/"],
    protectedFilePaths: frameworkOwnedLocalPaths,
    rootDir,
  });
}

export async function runGeneratedCodeHealth({
  logger = console,
  rootDir = appRoot,
} = {}) {
  const result = await evaluateGeneratedCodeHealth(rootDir);

  printCodeHealthResult(result, logger);
  if (!codeHealthPassed(result)) {
    logger.error(
      "\nToolcraft code health check failed. Split the file, move logic behind a focused product boundary, or make the typed contract explicit.",
    );
    return false;
  }

  logger.log(`Toolcraft code health check passed (${result.sourceFileCount} files).`);
  return true;
}

const isDirectExecution =
  process.argv[1] &&
  fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(scriptPath);

if (isDirectExecution) {
  const passed = await runGeneratedCodeHealth();
  if (!passed) {
    process.exitCode = 1;
  }
}
