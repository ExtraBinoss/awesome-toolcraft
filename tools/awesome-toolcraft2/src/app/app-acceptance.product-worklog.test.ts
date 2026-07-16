import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { appProductReadiness } from "./app-acceptance";
import { schemaHasProductSurface } from "./app-acceptance.schema-test-utils";
import {
  agentWorklogPath,
  getAgentWorklogValidationErrors,
} from "./app-acceptance.worklog-test-utils";
import { validateToolcraftPerformanceReceipt } from "../../scripts/toolcraft-verification-receipt.mjs";

const projectDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Toolcraft product worklog", () => {
  it("requires product apps to replace the starter worklog with decision evidence", async () => {
    if (appProductReadiness.mode !== "product" && !schemaHasProductSurface()) {
      return;
    }

    expect(existsSync(agentWorklogPath)).toBe(true);
    expect(getAgentWorklogValidationErrors(readFileSync(agentWorklogPath, "utf8"))).toEqual([]);
    expect(await validateToolcraftPerformanceReceipt({ rootDir: projectDir })).toEqual([]);
  });
});
