import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const verificationRoots = ["e2e", "public", "scripts", "src"];
const verificationRootFiles = [
  "index.html",
  "npm-shrinkwrap.json",
  "package-lock.json",
  "package.json",
  "playwright.config.ts",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "vite.config.ts",
];
const ignoredDirectoryNames = new Set([
  ".git",
  ".toolcraft",
  ".vite",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createToolcraftVerificationSourceHash(entries) {
  return sha256(
    [...entries]
      .sort((left, right) => compareCodeUnits(left.path, right.path))
      .map((entry) => `${entry.path}\0${entry.sha256}\n`)
      .join(""),
  );
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function collectFiles(directory, rootDir, files) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => compareCodeUnits(left.name, right.name));

  for (const entry of entries) {
    if (ignoredDirectoryNames.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Toolcraft verification inputs must not contain symbolic links: ${toPosixPath(path.relative(rootDir, absolutePath))}.`,
      );
    }
    if (entry.isDirectory()) {
      await collectFiles(absolutePath, rootDir, files);
      continue;
    }
    if (entry.isFile()) files.push(absolutePath);
  }
}

export async function collectToolcraftVerificationInputs(rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const files = [];

  for (const rootName of verificationRoots) {
    const absoluteRoot = path.join(resolvedRoot, rootName);
    if (await pathExists(absoluteRoot)) {
      await collectFiles(absoluteRoot, resolvedRoot, files);
    }
  }
  for (const fileName of verificationRootFiles) {
    const absolutePath = path.join(resolvedRoot, fileName);
    if (await pathExists(absolutePath)) files.push(absolutePath);
  }

  const uniqueFiles = [...new Set(files)].sort((left, right) =>
    compareCodeUnits(
      toPosixPath(path.relative(resolvedRoot, left)),
      toPosixPath(path.relative(resolvedRoot, right)),
    ),
  );
  const entries = [];
  for (const absolutePath of uniqueFiles) {
    entries.push({
      path: toPosixPath(path.relative(resolvedRoot, absolutePath)),
      sha256: sha256(await fs.readFile(absolutePath)),
    });
  }

  return {
    entries,
    sourceHash: createToolcraftVerificationSourceHash(entries),
  };
}

export function assertToolcraftVerificationInputsUnchanged({
  baseline,
  current,
  phase,
}) {
  if (baseline.sourceHash !== current.sourceHash) {
    throw new Error(
      `Toolcraft verification inputs changed ${phase}. Rerun pnpm verify:perf after edits stop.`,
    );
  }
}
