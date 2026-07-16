#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateIntegrityManifest } from "./toolcraft-integrity-manifest.mjs";
import { getToolcraftContractDocIntegrityFailures } from "./toolcraft-contract-doc-integrity.mjs";
import {
  requiredPackageScriptNames,
  requiredProtectedTrustRootFilePaths,
  reservedGeneratedVerificationConfigPatterns,
} from "./toolcraft-integrity-policy.mjs";

const appRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const platformOnly = process.argv.includes("--platform-only");
const toolcraftRoot = path.join(appRoot, "src/toolcraft");
const manifestPath = path.join(toolcraftRoot, ".toolcraft-manifest.json");

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function reportIntegrityFailures(failures) {
  console.error("Toolcraft generated app integrity check failed.");
  console.error(
    "Do not edit src/toolcraft or framework-owned verification infrastructure in generated apps.",
  );
  console.error(
    "Fix the source runtime in the monorepo, generate a fresh app folder, then move product-owned app source deliberately.",
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

async function collectToolcraftInventory(rootDir) {
  const files = [];
  const unsupportedEntries = [];

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const filePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await visit(filePath);
        continue;
      }

      if (entry.isFile() && entry.name !== ".toolcraft-manifest.json") {
        files.push(path.relative(rootDir, filePath).split(path.sep).join("/"));
        continue;
      }

      if (!entry.isFile()) {
        unsupportedEntries.push(
          path.relative(rootDir, filePath).split(path.sep).join("/"),
        );
      }
    }
  }

  await visit(rootDir);
  return {
    files: files.sort(),
    unsupportedEntries: unsupportedEntries.sort(),
  };
}

if (!(await pathExists(toolcraftRoot))) {
  reportIntegrityFailures([
    "Missing generated Toolcraft source tree src/toolcraft.",
  ]);
}

if (!(await pathExists(manifestPath))) {
  reportIntegrityFailures([
    "Missing src/toolcraft/.toolcraft-manifest.json; generated apps must preserve the integrity manifest.",
  ]);
}

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const manifestValidation = validateIntegrityManifest({
  appRoot,
  manifest,
  requiredPackageScriptNames,
  requiredProtectedTrustRootFilePaths,
  toolcraftRoot,
});

if (manifestValidation.failures.length > 0) {
  reportIntegrityFailures(manifestValidation.failures);
}

const {
  expectedPackageScripts,
  resolvedExpectedFiles,
  resolvedProtectedFiles,
} = manifestValidation;

const toolcraftInventory = await collectToolcraftInventory(toolcraftRoot);
const actualFiles = toolcraftInventory.files;
const actualFileSet = new Set(actualFiles);
const failures = toolcraftInventory.unsupportedEntries.map(
  (relativePath) => `unsupported Toolcraft entry ${relativePath}`,
);

const rootEntries = await fs.readdir(appRoot, { withFileTypes: true });
for (const entry of rootEntries) {
  if (
    reservedGeneratedVerificationConfigPatterns.some((pattern) =>
      pattern.test(entry.name),
    ) &&
    !resolvedProtectedFiles.has(entry.name)
  ) {
    failures.push(`unapproved verification config ${entry.name}`);
  }
}

try {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(appRoot, "package.json"), "utf8"),
  );
  const actualPackageScripts = packageJson.scripts ?? {};

  for (const [scriptName, expectedCommand] of expectedPackageScripts) {
    if (actualPackageScripts[scriptName] !== expectedCommand) {
      failures.push(`modified package script ${scriptName}`);
    }
  }

  for (const scriptName of Object.keys(actualPackageScripts)) {
    const lifecycleTarget = scriptName.startsWith("pre")
      ? scriptName.slice("pre".length)
      : scriptName.startsWith("post")
        ? scriptName.slice("post".length)
        : "";

    if (
      expectedPackageScripts.has(lifecycleTarget) &&
      !expectedPackageScripts.has(scriptName)
    ) {
      failures.push(`added package lifecycle script ${scriptName}`);
    }
  }
} catch {
  failures.push("missing or invalid package.json");
}

if (!platformOnly) {
  const {
    evaluateToolcraftProductBoundary,
    printToolcraftProductBoundaryResult,
    toolcraftProductBoundaryPassed,
  } = await import("./toolcraft-product-boundary.mjs");
  const productBoundaryResult = await evaluateToolcraftProductBoundary({
    protectedFilePaths: resolvedProtectedFiles.keys(),
    rootDir: appRoot,
  });

  if (!toolcraftProductBoundaryPassed(productBoundaryResult)) {
    const boundaryMessages = [];
    printToolcraftProductBoundaryResult(productBoundaryResult, {
      error(message) {
        boundaryMessages.push(message.replace(/^- /u, ""));
      },
    });
    failures.push(...boundaryMessages);
  }
}

for (const [relativePath, { expectedHash, filePath }] of resolvedExpectedFiles) {
  if (!actualFileSet.has(relativePath)) {
    failures.push(`deleted ${relativePath}`);
    continue;
  }

  const actualHash = await hashFile(filePath);

  if (actualHash !== expectedHash) {
    failures.push(`modified ${relativePath}`);
  }
}

for (const relativePath of actualFiles) {
  if (!resolvedExpectedFiles.has(relativePath)) {
    failures.push(`added ${relativePath}`);
  }
}

for (const [relativePath, { expectedHash, filePath }] of resolvedProtectedFiles) {
  if (!(await pathExists(filePath))) {
    failures.push(`deleted ${relativePath}`);
    continue;
  }

  if ((await hashFile(filePath)) !== expectedHash) {
    failures.push(`modified ${relativePath}`);
  }
}

failures.push(
  ...(await getToolcraftContractDocIntegrityFailures({
    appRoot,
    protectedRelativePaths: resolvedProtectedFiles.keys(),
  })),
);

if (failures.length > 0) {
  reportIntegrityFailures(failures);
}

console.log(`Toolcraft integrity check passed (${actualFiles.length} files).`);
