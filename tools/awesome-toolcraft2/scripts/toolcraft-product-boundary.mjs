#!/usr/bin/env node

import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { collectToolcraftFrameworkOwnedLocalPaths } from "./toolcraft-source-ownership.mjs";
import { collectToolcraftSourceInventory } from "./toolcraft-source-inventory.mjs";

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function resolveProtectedFilePaths(rootDir, protectedFilePaths) {
  if (protectedFilePaths) return [...protectedFilePaths];

  return collectToolcraftFrameworkOwnedLocalPaths(rootDir);
}

export async function evaluateToolcraftProductBoundary({
  allowMissingCompiler = false,
  protectedFilePaths,
  rootDir,
} = {}) {
  const resolvedRootDir =
    rootDir ?? path.resolve(fileURLToPath(new URL("..", import.meta.url)));
  const inventory = await collectToolcraftSourceInventory({
    protectedFilePaths: await resolveProtectedFilePaths(
      resolvedRootDir,
      protectedFilePaths,
    ),
    rootDir: resolvedRootDir,
    sourceRoots: ["src", "e2e"],
  });
  const productEntries = inventory.entries.filter(
    (entry) => entry.owner === "product" && entry.role === "production",
  );
  const violations = [];
  let collectToolcraftModuleSpecifiers;
  let inspectToolcraftProductCss;
  let inspectToolcraftProductSource;
  let inspectToolcraftModuleLoading;
  let inspectToolcraftReservedEvidenceAccess;

  try {
    ({
      collectToolcraftModuleSpecifiers,
      inspectToolcraftProductCss,
      inspectToolcraftProductSource,
    } = await import("./toolcraft-product-boundary-ast.mjs"));
    ({
      inspectToolcraftModuleLoading,
      inspectToolcraftReservedEvidenceAccess,
    } = await import("./toolcraft-product-evidence-boundary-ast.mjs"));
  } catch (error) {
    const isMissingTypeScript =
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      String(error.message).includes("package 'typescript'");
    if (!allowMissingCompiler || !isMissingTypeScript) throw error;

    return {
      filesystemViolations: inventory.filesystemViolations,
      productSourceCount: productEntries.length,
      skippedReason:
        "TypeScript is not installed; product AST boundary validation is deferred until dependencies are installed.",
      violations: [],
    };
  }

  const entryByAbsolutePath = new Map(
    inventory.entries.map((entry) => [path.resolve(entry.absolutePath), entry]),
  );
  const moduleExtensions = [
    ".ts",
    ".tsx",
    ".mts",
    ".cts",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".css",
  ];

  function resolveLocalEntry(entry, moduleSpecifier) {
    let basePath;
    if (moduleSpecifier.startsWith("@/") || moduleSpecifier.startsWith("#/")) {
      basePath = path.resolve(resolvedRootDir, "src", moduleSpecifier.slice(2));
    } else if (moduleSpecifier.startsWith("/")) {
      basePath = path.resolve(resolvedRootDir, moduleSpecifier.slice(1));
    } else if (moduleSpecifier.startsWith(".")) {
      basePath = path.resolve(path.dirname(entry.absolutePath), moduleSpecifier);
    } else {
      return {};
    }

    const candidates = [
      basePath,
      ...moduleExtensions.map((extension) => `${basePath}${extension}`),
      ...moduleExtensions.map((extension) => path.join(basePath, `index${extension}`)),
    ];
    const importedEntry = candidates
      .map((candidate) => entryByAbsolutePath.get(candidate))
      .find(Boolean);
    const unscannedSourcePath = importedEntry
      ? undefined
      : candidates.find(
          (candidate) =>
            moduleExtensions.includes(path.extname(candidate)) &&
            fs.existsSync(candidate) &&
            fs.statSync(candidate).isFile(),
        );

    return { importedEntry, unscannedSourcePath };
  }

  for (const entry of productEntries) {
    if (/\.css$/u.test(entry.repoPath)) {
      violations.push(
        ...inspectToolcraftProductCss({
          ...entry,
          rawSource: await fsPromises.readFile(entry.absolutePath, "utf8"),
        }),
      );
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/u.test(entry.repoPath)) continue;
    const rawSource = await fsPromises.readFile(entry.absolutePath, "utf8");
    violations.push(
      ...inspectToolcraftProductSource({
        ...entry,
        rawSource,
        rootDir: resolvedRootDir,
      }),
      ...inspectToolcraftReservedEvidenceAccess({
        ...entry,
        rawSource,
      }),
    );
    for (const moduleSpecifier of collectToolcraftModuleSpecifiers({
      ...entry,
      rawSource,
    })) {
      const { importedEntry, unscannedSourcePath } = resolveLocalEntry(
        entry,
        moduleSpecifier,
      );
      if (unscannedSourcePath) {
        violations.push({
          column: 1,
          kind: "source-boundary-escape",
          line: 1,
          message: `Product production source must stay under the scanned src boundary. Move ${path.relative(resolvedRootDir, unscannedSourcePath)} under src before importing it.`,
          repoPath: entry.repoPath,
        });
      }
      if (
        importedEntry?.role === "test" ||
        importedEntry?.role === "test-support" ||
        /(?:^|\/)[^/]+\.(?:test|spec)(?:\.[cm]?[jt]sx?)?$/u.test(moduleSpecifier)
      ) {
        violations.push({
          column: 1,
          kind: "production-test-import",
          line: 1,
          message: `Production source must not import test or test-support module ${moduleSpecifier}. Move reusable product code into an explicit production module.`,
          repoPath: entry.repoPath,
        });
      }
    }
  }

  for (const entry of inventory.entries) {
    if (
      entry.owner !== "product" ||
      (entry.role !== "test" && entry.role !== "test-support") ||
      !/\.[cm]?[jt]sx?$/u.test(entry.repoPath)
    ) {
      continue;
    }
    const rawSource = await fsPromises.readFile(entry.absolutePath, "utf8");
    violations.push(
      ...inspectToolcraftReservedEvidenceAccess({
        ...entry,
        rawSource,
      }),
      ...inspectToolcraftModuleLoading({
        ...entry,
        rawSource,
      }),
    );
  }

  return {
    filesystemViolations: inventory.filesystemViolations,
    productSourceCount: productEntries.length,
    violations: violations.sort(
      (left, right) =>
        compareCodeUnits(left.repoPath, right.repoPath) ||
        left.line - right.line ||
        left.column - right.column,
    ),
  };
}

export function printToolcraftProductBoundaryResult(result, logger = console) {
  for (const violation of result.filesystemViolations) {
    logger.error(`- ${violation.repoPath}: ${violation.reason}`);
  }
  for (const violation of result.violations) {
    logger.error(
      `- ${violation.repoPath}:${violation.line}:${violation.column}: ${violation.message}`,
    );
  }
}

export function toolcraftProductBoundaryPassed(result) {
  return (
    result.filesystemViolations.length === 0 && result.violations.length === 0
  );
}

const scriptPath = fileURLToPath(import.meta.url);
const isDirectExecution =
  process.argv[1] &&
  fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(scriptPath);

if (isDirectExecution) {
  const result = await evaluateToolcraftProductBoundary({
    allowMissingCompiler: process.argv.includes("--allow-missing-compiler"),
  });
  if (!toolcraftProductBoundaryPassed(result)) {
    console.error("Toolcraft product boundary check failed.");
    printToolcraftProductBoundaryResult(result);
    process.exitCode = 1;
  } else {
    console.log(
      result.skippedReason ??
        `Toolcraft product boundary check passed (${result.productSourceCount} product production files).`,
    );
  }
}
