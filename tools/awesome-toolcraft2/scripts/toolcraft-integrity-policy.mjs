import { toolcraftContractManifest } from "./toolcraft-contract-manifest.mjs";

export const requiredPackageScriptNames = [
  "ai:check",
  "build",
  "dev",
  "dev:restart",
  "preview",
  "preview:restart",
  "test",
  "test:browser",
  "test:browser:perf",
  "typecheck",
  "verify:final",
  "verify:perf",
  "verify:perf:playwright",
  "verify:quick",
  "verify:ui",
];

export const reservedGeneratedVerificationConfigPatterns = [
  /^playwright\.config\.[cm]?[jt]s$/u,
  /^vite\.config\.[cm]?[jt]s$/u,
  /^vitest\.config\.[cm]?[jt]s$/u,
  /^vitest\.workspace\.[cm]?[jt]s$/u,
];

export const requiredProtectedTrustRootFilePaths = [
  "AGENTS.md",
  "docs/toolcraft/workflow.md",
  "e2e/app-browser-runtime-evidence.spec.ts",
  "e2e/browser-runtime-evidence-reporter.ts",
  "e2e/browser-runtime-evidence-requirements.ts",
  "playwright.config.ts",
  "scripts/check-toolcraft-code-health.mjs",
  "scripts/check-toolcraft-integrity.mjs",
  "scripts/toolcraft-integrity-manifest.mjs",
  "scripts/toolcraft-integrity-policy.mjs",
  "scripts/toolcraft-product-boundary.mjs",
  "scripts/toolcraft-source-ownership.mjs",
  "scripts/toolcraft-vitest-runtime-contract.mjs",
  "scripts/toolcraft-vitest-runtime-evidence-reporter.mjs",
  "scripts/toolcraft-workflow-routes.mjs",
  "src/app/acceptance/validation-pipeline.ts",
  "src/app/app-automated-runtime-evidence.test.ts",
  "src/main.tsx",
  "vite.config.ts",
];

export const runtimeSurfaceComponentNames = Object.freeze([
  ...toolcraftContractManifest.runtimeSurfaceComponentNames,
]);

export const builtInControlExportNames = Object.freeze([
  ...toolcraftContractManifest.protectedControlExportNames,
]);

export const builtInControlComponentNames = Object.freeze(
  builtInControlExportNames.filter((name) => name.endsWith("Control")),
);
