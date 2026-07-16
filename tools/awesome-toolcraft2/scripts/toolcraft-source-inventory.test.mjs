import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  classifyToolcraftSourcePath,
  collectToolcraftSourceInventory,
  collectToolcraftSourceInventorySync,
} from "./toolcraft-source-inventory.mjs";

test("classifies platform, framework, product, test, and generated source", () => {
  const options = {
    protectedFilePaths: ["src/main.tsx", "src/routes/index.tsx"],
  };

  assert.deepEqual(classifyToolcraftSourcePath("src/main.tsx", options), {
    owner: "platform",
    role: "production",
  });
  assert.deepEqual(
    classifyToolcraftSourcePath("src/toolcraft/runtime/react/index.ts", options),
    { owner: "framework", role: "production" },
  );
  assert.deepEqual(
    classifyToolcraftSourcePath("src/features/renderer.tsx", options),
    { owner: "product", role: "production" },
  );
  assert.deepEqual(
    classifyToolcraftSourcePath("src/features/renderer.test.tsx", options),
    { owner: "product", role: "test" },
  );
  assert.deepEqual(
    classifyToolcraftSourcePath("src/features/renderer-test-utils.ts", options),
    { owner: "product", role: "test-support" },
  );
  assert.deepEqual(
    classifyToolcraftSourcePath("src/features/renderer.fixtures.ts", options),
    { owner: "product", role: "test-support" },
  );
  assert.deepEqual(
    classifyToolcraftSourcePath("src/routes/route-tree.gen.ts", options),
    { owner: "product", role: "generated" },
  );
});

test("collects each source path once and rejects symbolic links", async (context) => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "toolcraft-inventory-"));
  context.after(() => fs.rm(rootDir, { force: true, recursive: true }));

  await fs.mkdir(path.join(rootDir, "src/features"), { recursive: true });
  await fs.writeFile(path.join(rootDir, "src/main.tsx"), "export {};\n");
  await fs.writeFile(
    path.join(rootDir, "src/features/renderer.tsx"),
    "export function Renderer() { return null; }\n",
  );
  await fs.symlink(
    path.join(rootDir, "src/features/renderer.tsx"),
    path.join(rootDir, "src/features/renderer-link.tsx"),
  );
  await fs.symlink(
    path.join(rootDir, "src/features/renderer.tsx"),
    path.join(rootDir, "src/features/ignored-link.tsx"),
  );

  const inventory = await collectToolcraftSourceInventory({
    ignoredFilePatterns: [/ignored-link/u],
    protectedFilePaths: ["src/main.tsx"],
    rootDir,
    sourceRoots: ["src", "src/features"],
  });

  assert.deepEqual(
    inventory.entries.map(({ owner, repoPath, role }) => ({ owner, repoPath, role })),
    [
      { owner: "product", repoPath: "src/features/renderer.tsx", role: "production" },
      { owner: "platform", repoPath: "src/main.tsx", role: "production" },
    ],
  );
  assert.deepEqual(inventory.filesystemViolations, [
    {
      reason:
        "Symbolic links can move checked source outside the Toolcraft source boundary.",
      repoPath: "src/features/ignored-link.tsx",
    },
    {
      reason:
        "Symbolic links can move checked source outside the Toolcraft source boundary.",
      repoPath: "src/features/renderer-link.tsx",
    },
  ]);

  assert.deepEqual(
    collectToolcraftSourceInventorySync({
      ignoredFilePatterns: [/ignored-link/u],
      protectedFilePaths: ["src/main.tsx"],
      rootDir,
      sourceRoots: ["src", "src/features"],
    }),
    inventory,
  );
});

test("rejects a symbolic link used as a configured source root", async (context) => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "toolcraft-inventory-root-"));
  context.after(() => fs.rm(rootDir, { force: true, recursive: true }));

  await fs.mkdir(path.join(rootDir, "outside-source"), { recursive: true });
  await fs.writeFile(
    path.join(rootDir, "outside-source/product.ts"),
    "export const product = true;\n",
  );
  await fs.symlink(
    path.join(rootDir, "outside-source"),
    path.join(rootDir, "linked-source"),
  );

  const inventory = collectToolcraftSourceInventorySync({
    rootDir,
    sourceRoots: ["linked-source"],
  });

  assert.deepEqual(inventory.entries, []);
  assert.deepEqual(inventory.filesystemViolations, [
    {
      reason:
        "Symbolic links can move checked source outside the Toolcraft source boundary.",
      repoPath: "linked-source",
    },
  ]);
});
