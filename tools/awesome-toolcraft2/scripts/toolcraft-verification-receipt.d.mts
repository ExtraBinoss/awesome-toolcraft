export function validateToolcraftPerformanceReceipt(options: {
  rootDir: string;
}): Promise<string[]>;

export function assertToolcraftVerificationInputsUnchanged(options: {
  baseline: { sourceHash: string };
  current: { sourceHash: string };
  phase: string;
}): void;

export function getToolcraftPerformanceExemptionBlockedFiles(
  changedFiles: readonly string[],
): string[];

export function writeToolcraftPerformanceExemption(options: {
  reasonCode: "post-first-working-non-performance";
  rootDir: string;
  verificationTier: 0 | 1 | 2;
}): Promise<unknown>;
