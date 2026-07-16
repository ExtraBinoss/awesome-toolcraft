import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const toolcraftFrameworkOwnedSourceRoots = Object.freeze([
  "docs/toolcraft",
  "scripts",
  "src/app",
  "e2e",
]);

export const toolcraftFrameworkOwnedRootFiles = Object.freeze([
  "AGENTS.md",
  "LICENSE.md",
  "NOTICE.md",
  "index.html",
  "playwright.config.ts",
  "src/main.tsx",
  "src/router.tsx",
  "src/routes/index.tsx",
  "src/routes/root.tsx",
  "src/styles.css",
  "tsconfig.json",
  "vite.config.ts",
]);

export const toolcraftProductOwnedGeneratedPaths = Object.freeze([
  "docs/toolcraft/agent-worklog.md",
  "e2e/app-controls.spec.ts",
  "src/app/app-acceptance-data.ts",
  "src/app/app-composition.tsx",
  "src/app/app-performance.ts",
  "src/app/app-schema.test.ts",
  "src/app/app-schema.ts",
]);

const productOwnedGeneratedPathSet = new Set(
  toolcraftProductOwnedGeneratedPaths,
);

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPosixPath(value) {
  return String(value).split(path.sep).join("/").replace(/^\.\//u, "");
}

export function toToolcraftGeneratedPath(relativePath) {
  const normalizedPath = toPosixPath(relativePath);

  return normalizedPath.startsWith("src/app/starter-")
    ? normalizedPath.replace(/^src\/app\/starter-/u, "src/app/app-")
    : normalizedPath;
}

export function isToolcraftFrameworkOwnedPath(relativePath) {
  const generatedPath = toToolcraftGeneratedPath(relativePath);
  const isFrameworkCandidate =
    toolcraftFrameworkOwnedSourceRoots.some(
      (root) =>
        generatedPath === root || generatedPath.startsWith(`${root}/`),
    ) || toolcraftFrameworkOwnedRootFiles.includes(generatedPath);

  return (
    isFrameworkCandidate && !productOwnedGeneratedPathSet.has(generatedPath)
  );
}

async function collectRelativeFiles(rootDir, relativeRoot) {
  const directory = path.join(rootDir, ...relativeRoot.split("/"));
  let entries;

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(relativeRoot, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectRelativeFiles(rootDir, relativePath)));
    } else if (
      entry.isFile() &&
      entry.name !== ".toolcraft-manifest.json"
    ) {
      files.push(relativePath);
    }
  }

  return files;
}

async function collectOwnershipCandidates(rootDir) {
  const rootedFiles = (
    await Promise.all(
      toolcraftFrameworkOwnedSourceRoots.map((relativeRoot) =>
        collectRelativeFiles(rootDir, relativeRoot),
      ),
    )
  ).flat();
  const existingRootFiles = [];

  for (const relativePath of toolcraftFrameworkOwnedRootFiles) {
    try {
      const stat = await fs.stat(
        path.join(rootDir, ...relativePath.split("/")),
      );
      if (stat.isFile()) existingRootFiles.push(relativePath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  return [...new Set([...existingRootFiles, ...rootedFiles])].sort(
    compareCodeUnits,
  );
}

export async function collectToolcraftFrameworkOwnedLocalPaths(rootDir) {
  const manifestPath = path.join(
    rootDir,
    "src/toolcraft/.toolcraft-manifest.json",
  );

  try {
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    return Object.keys(manifest.protectedFiles ?? {}).sort(compareCodeUnits);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const localPolicyPath = path.join(
    rootDir,
    "scripts/toolcraft-source-ownership.mjs",
  );
  let ownsPolicyRoot = false;

  try {
    ownsPolicyRoot =
      (await fs.realpath(localPolicyPath)) ===
      (await fs.realpath(fileURLToPath(import.meta.url)));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  if (!ownsPolicyRoot) return [];

  return (await collectOwnershipCandidates(rootDir))
    .filter(isToolcraftFrameworkOwnedPath)
    .sort(compareCodeUnits);
}

export async function collectToolcraftFrameworkOwnedGeneratedPaths(rootDir) {
  return [
    ...new Set(
      (await collectToolcraftFrameworkOwnedLocalPaths(rootDir)).map(
        toToolcraftGeneratedPath,
      ),
    ),
  ].sort(compareCodeUnits);
}
