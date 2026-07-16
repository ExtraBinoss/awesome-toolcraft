#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertToolcraftVerificationInputsUnchanged,
  collectToolcraftVerificationInputs,
  createToolcraftVerificationSourceHash,
} from "./toolcraft-verification-inventory.mjs";

export {
  assertToolcraftVerificationInputsUnchanged,
  collectToolcraftVerificationInputs,
};

export const TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION = 1;
export const TOOLCRAFT_PERFORMANCE_EXEMPTION_REASON =
  "post-first-working-non-performance";

const acceptedRunners = new Set(["playwright-fallback"]);
const performanceExemptionBlockedRootFiles = new Set([
  "index.html",
  "npm-shrinkwrap.json",
  "package-lock.json",
  "package.json",
  "playwright.config.ts",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "vite.config.ts",
]);
const performanceSensitivePathPattern =
  /(?:^|[/_.-])(?:animation|canvas|exports?|images?|keyframes?|layers?|media|outputs?|performance|renders?|renderers?|rendering|shaders?|timeline|uploads?|videos?|viewport|webgl|workers?)(?=$|[/_.-])/u;

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

export function getToolcraftPerformanceReceiptPath(rootDir) {
  return path.join(
    path.resolve(rootDir),
    ".toolcraft",
    "verification",
    "performance.json",
  );
}

async function writeReceipt(rootDir, receipt) {
  const receiptPath = getToolcraftPerformanceReceiptPath(rootDir);
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  const temporaryPath = `${receiptPath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.rename(temporaryPath, receiptPath);
  return receipt;
}

export async function clearToolcraftPerformanceReceipt(rootDir) {
  await fs.rm(getToolcraftPerformanceReceiptPath(rootDir), { force: true });
}

function isReceiptFileEntry(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof value.path !== "string" ||
    typeof value.sha256 !== "string"
  ) {
    return false;
  }
  const pathSegments = value.path.split("/");
  return (
    value.path.length > 0 &&
    !value.path.includes("\\") &&
    !path.posix.isAbsolute(value.path) &&
    !pathSegments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    ) &&
    /^[a-f0-9]{64}$/u.test(value.sha256)
  );
}

function getReceiptInventoryError(receipt) {
  const uniquePaths = new Set(receipt.files.map((entry) => entry.path));
  if (uniquePaths.size !== receipt.files.length) {
    return "Toolcraft performance receipt file inventory contains duplicate paths.";
  }
  if (createToolcraftVerificationSourceHash(receipt.files) !== receipt.sourceHash) {
    return "Toolcraft performance receipt file inventory does not produce its source hash.";
  }
  return undefined;
}

function getReceiptShapeError(receipt) {
  if (
    typeof receipt !== "object" ||
    receipt === null ||
    Array.isArray(receipt) ||
    receipt.version !== TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION ||
    typeof receipt.sourceHash !== "string" ||
    !Array.isArray(receipt.files) ||
    !receipt.files.every(isReceiptFileEntry)
  ) {
    return "Toolcraft performance receipt is malformed or uses an unsupported version.";
  }
  if (receipt.status !== "passed" && receipt.status !== "not-required") {
    return "Toolcraft performance receipt must record a passed checkpoint or typed not-required exemption.";
  }
  if (receipt.kind === "performance-checkpoint") {
    if (receipt.status !== "passed" || !acceptedRunners.has(receipt.runner)) {
      return "Toolcraft performance checkpoint receipt must be passed and name a supported runner.";
    }
    return getReceiptInventoryError(receipt);
  }
  if (receipt.kind === "performance-exemption") {
    if (
      receipt.status !== "not-required" ||
      receipt.reasonCode !== TOOLCRAFT_PERFORMANCE_EXEMPTION_REASON ||
      ![0, 1, 2].includes(receipt.verificationTier) ||
      typeof receipt.baselineSourceHash !== "string" ||
      !Array.isArray(receipt.changedFiles) ||
      !receipt.changedFiles.every((item) => typeof item === "string")
    ) {
      return "Toolcraft performance exemption receipt is malformed.";
    }
    return getReceiptInventoryError(receipt);
  }
  return "Toolcraft performance receipt kind is unsupported.";
}

async function readReceipt(rootDir) {
  const receiptPath = getToolcraftPerformanceReceiptPath(rootDir);
  let source;
  try {
    source = await fs.readFile(receiptPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { missing: true };
    throw error;
  }
  try {
    return { receipt: JSON.parse(source) };
  } catch {
    return { malformed: true };
  }
}

export async function validateToolcraftPerformanceReceipt({ rootDir }) {
  const loaded = await readReceipt(rootDir);
  if (loaded.missing) {
    return [
      "Toolcraft performance receipt is missing. Run the required browser performance checkpoint for the current sources.",
    ];
  }
  if (loaded.malformed) {
    return ["Toolcraft performance receipt is malformed JSON."];
  }

  const shapeError = getReceiptShapeError(loaded.receipt);
  if (shapeError) return [shapeError];

  const inventory = await collectToolcraftVerificationInputs(rootDir);
  if (loaded.receipt.sourceHash !== inventory.sourceHash) {
    return [
      "Toolcraft performance receipt is stale because product or verification inputs changed after the recorded checkpoint.",
    ];
  }
  return [];
}

function getChangedFiles(previousFiles, currentFiles) {
  const previous = new Map(previousFiles.map((entry) => [entry.path, entry.sha256]));
  const current = new Map(currentFiles.map((entry) => [entry.path, entry.sha256]));
  return [...new Set([...previous.keys(), ...current.keys()])]
    .filter((filePath) => previous.get(filePath) !== current.get(filePath))
    .sort(compareCodeUnits);
}

function blocksToolcraftPerformanceExemption(filePath) {
  const normalizedPath = toPosixPath(filePath).replace(/^\.\//u, "").toLowerCase();

  return (
    performanceExemptionBlockedRootFiles.has(normalizedPath) ||
    normalizedPath.startsWith("public/") ||
    normalizedPath.startsWith("scripts/") ||
    normalizedPath.startsWith("src/toolcraft/") ||
    /^src\/app\/app-composition\.[^/]+$/u.test(normalizedPath) ||
    performanceSensitivePathPattern.test(normalizedPath)
  );
}

export function getToolcraftPerformanceExemptionBlockedFiles(changedFiles) {
  return [...new Set(changedFiles.filter(blocksToolcraftPerformanceExemption))].sort(
    compareCodeUnits,
  );
}

export async function writeToolcraftPerformanceExemption({
  reasonCode,
  rootDir,
  verificationTier,
}) {
  if (reasonCode !== TOOLCRAFT_PERFORMANCE_EXEMPTION_REASON) {
    throw new Error(
      `Toolcraft performance exemption reason must be ${TOOLCRAFT_PERFORMANCE_EXEMPTION_REASON}.`,
    );
  }
  if (![0, 1, 2].includes(verificationTier)) {
    throw new Error("Toolcraft performance exemptions are limited to verification tiers 0, 1, or 2.");
  }
  const loaded = await readReceipt(rootDir);
  const shapeError = loaded.receipt ? getReceiptShapeError(loaded.receipt) : undefined;
  if (
    !loaded.receipt ||
    shapeError ||
    loaded.receipt.kind !== "performance-checkpoint" ||
    loaded.receipt.status !== "passed"
  ) {
    throw new Error(
      "A typed performance exemption requires a prior passed performance checkpoint receipt.",
    );
  }

  const inventory = await collectToolcraftVerificationInputs(rootDir);
  const changedFiles = getChangedFiles(loaded.receipt.files, inventory.entries);
  if (changedFiles.length === 0) {
    throw new Error("A performance exemption requires at least one changed verification input.");
  }
  const blockedFiles = getToolcraftPerformanceExemptionBlockedFiles(changedFiles);
  if (blockedFiles.length > 0) {
    throw new Error(
      `A performance exemption cannot cover Tier 3 or Tier 4 changes: ${blockedFiles.join(", ")}. Run pnpm verify:perf for the current sources.`,
    );
  }
  return writeReceipt(rootDir, {
    baselineSourceHash: loaded.receipt.sourceHash,
    changedFiles,
    completedAt: new Date().toISOString(),
    files: inventory.entries,
    kind: "performance-exemption",
    reasonCode,
    sourceHash: inventory.sourceHash,
    status: "not-required",
    verificationTier,
    version: TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  });
}

async function runCli() {
  const projectDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const [command = "validate", ...args] = process.argv.slice(2);

  if (command === "record-exemption") {
    const tierArgument = args.find((argument) => argument.startsWith("--tier="));
    const verificationTier = Number(tierArgument?.slice("--tier=".length));
    await writeToolcraftPerformanceExemption({
      reasonCode: TOOLCRAFT_PERFORMANCE_EXEMPTION_REASON,
      rootDir: projectDir,
      verificationTier,
    });
    console.log("Recorded current-source Toolcraft post-first-working performance exemption.");
    return;
  }
  if (command !== "validate") {
    throw new Error(`Unknown Toolcraft verification receipt command: ${command}.`);
  }
  const errors = await validateToolcraftPerformanceReceipt({ rootDir: projectDir });
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  console.log("Toolcraft performance receipt is current and valid.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
