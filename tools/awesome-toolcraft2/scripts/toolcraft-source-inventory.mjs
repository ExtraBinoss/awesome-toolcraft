import fs from "node:fs";
import path from "node:path";

export const toolcraftSourceExtensions = new Set([
  ".cjs",
  ".css",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);

const defaultGeneratedFilePatterns = [/\/route-tree\.gen\.ts$/u];
const defaultTestFilePatterns = [
  /(?:^|\/)[^/]+\.(?:test|spec)\.[cm]?[jt]sx?$/u,
];
const defaultTestSupportPatterns = [
  /^e2e\//u,
  /(?:^|\/)test-evidence\//u,
  /(?:^|\/)[^/]*(?:test-utils|fixtures)\.[cm]?[jt]sx?$/u,
];

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function matchesAny(repoPath, patterns) {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(repoPath);
  });
}

function normalizePrefix(prefix) {
  const normalized = toPosixPath(prefix).replace(/^\.\//u, "");
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

export function classifyToolcraftSourcePath(
  repoPath,
  {
    frameworkPathPrefixes = ["src/toolcraft/"],
    generatedFilePatterns = defaultGeneratedFilePatterns,
    protectedFilePaths = [],
    testFilePatterns = defaultTestFilePatterns,
    testSupportPatterns = defaultTestSupportPatterns,
  } = {},
) {
  const normalizedPath = toPosixPath(repoPath).replace(/^\.\//u, "");
  const protectedPathSet = new Set(
    protectedFilePaths.map((filePath) =>
      toPosixPath(filePath).replace(/^\.\//u, ""),
    ),
  );
  const normalizedFrameworkPrefixes = frameworkPathPrefixes.map(normalizePrefix);

  const owner = protectedPathSet.has(normalizedPath)
    ? "platform"
    : normalizedFrameworkPrefixes.some((prefix) =>
          normalizedPath.startsWith(prefix),
        )
      ? "framework"
      : "product";
  const role = matchesAny(normalizedPath, generatedFilePatterns)
    ? "generated"
    : matchesAny(normalizedPath, testFilePatterns)
      ? "test"
      : matchesAny(normalizedPath, testSupportPatterns)
        ? "test-support"
        : "production";

  return { owner, role };
}

export function collectToolcraftSourceInventorySync({
  frameworkPathPrefixes = ["src/toolcraft/"],
  generatedFilePatterns = defaultGeneratedFilePatterns,
  ignoredFilePatterns = [],
  protectedFilePaths = [],
  rootDir,
  sourceExtensions = toolcraftSourceExtensions,
  sourceRoots = ["src"],
  testFilePatterns = defaultTestFilePatterns,
  testSupportPatterns = defaultTestSupportPatterns,
}) {
  const entriesByRepoPath = new Map();
  const filesystemViolationsByRepoPath = new Map();

  function recordSymbolicLink(repoPath) {
    filesystemViolationsByRepoPath.set(repoPath, {
      reason:
        "Symbolic links can move checked source outside the Toolcraft source boundary.",
      repoPath,
    });
  }

  function visit(directory) {
    let entries;

    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const repoPath = toPosixPath(path.relative(rootDir, absolutePath));

      if (entry.isSymbolicLink()) {
        recordSymbolicLink(repoPath);
        continue;
      }

      if (matchesAny(repoPath, ignoredFilePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) {
        continue;
      }

      const classification = classifyToolcraftSourcePath(repoPath, {
        frameworkPathPrefixes,
        generatedFilePatterns,
        protectedFilePaths,
        testFilePatterns,
        testSupportPatterns,
      });

      entriesByRepoPath.set(repoPath, {
        absolutePath,
        repoPath,
        ...classification,
      });
    }
  }

  for (const sourceRoot of sourceRoots) {
    const absoluteSourceRoot = path.join(rootDir, sourceRoot);
    let sourceRootStat;

    try {
      sourceRootStat = fs.lstatSync(absoluteSourceRoot);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }

    if (sourceRootStat.isSymbolicLink()) {
      recordSymbolicLink(
        toPosixPath(path.relative(rootDir, absoluteSourceRoot)),
      );
      continue;
    }

    visit(absoluteSourceRoot);
  }

  return {
    entries: [...entriesByRepoPath.values()].sort((left, right) =>
      compareCodeUnits(left.repoPath, right.repoPath),
    ),
    filesystemViolations: [...filesystemViolationsByRepoPath.values()].sort(
      (left, right) => compareCodeUnits(left.repoPath, right.repoPath),
    ),
  };
}

export async function collectToolcraftSourceInventory(options) {
  return collectToolcraftSourceInventorySync(options);
}
