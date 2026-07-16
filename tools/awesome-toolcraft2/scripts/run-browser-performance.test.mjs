import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptsDir);
const runnerPath = path.join(scriptsDir, "run-browser-performance.mjs");

test("protected performance runner rejects Playwright filters before launching tools", () => {
  const receiptPath = path.join(
    projectDir,
    ".toolcraft",
    "verification",
    "performance.json",
  );
  const hadReceipt = existsSync(receiptPath);
  const originalReceipt = hadReceipt ? readFileSync(receiptPath) : undefined;
  const sentinelReceipt = Buffer.from("protected receipt sentinel\n");
  mkdirSync(path.dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, sentinelReceipt);

  try {
    const result = spawnSync(
      process.execPath,
      [runnerPath, "e2e/app-performance.spec.ts"],
      {
        cwd: projectDir,
        encoding: "utf8",
        timeout: 5_000,
      },
    );

    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /do not accept Playwright arguments.*app-performance\.spec\.ts/iu,
    );
    assert.deepEqual(readFileSync(receiptPath), sentinelReceipt);
  } finally {
    if (originalReceipt) writeFileSync(receiptPath, originalReceipt);
    else rmSync(receiptPath, { force: true });
  }
});
