import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  getToolcraftProductDependencyCycleViolations,
  loadToolcraftLocalModuleAliases,
} from "./toolcraft-product-dependency-graph.mjs";
import { collectToolcraftSourceInventory } from "./toolcraft-source-inventory.mjs";

async function withDependencyFixture(
  files,
  assertion,
  { sourceRoots = ["src"] } = {},
) {
  const rootDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "toolcraft-dependency-graph-"),
  );

  try {
    for (const [repoPath, source] of Object.entries(files)) {
      const filePath = path.join(rootDir, repoPath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, source);
    }
    const inventory = await collectToolcraftSourceInventory({
      frameworkPathPrefixes: ["src/toolcraft/"],
      rootDir,
      sourceRoots,
    });
    await assertion({ inventory, rootDir });
  } finally {
    await fs.rm(rootDir, { force: true, recursive: true });
  }
}

test("reports a complete direct product dependency cycle", async () => {
  await withDependencyFixture(
    {
      "src/a.ts": 'import "./b";\n',
      "src/b.ts": 'import "./a";\n',
    },
    async ({ inventory, rootDir }) => {
      assert.deepEqual(
        getToolcraftProductDependencyCycleViolations({
          entries: inventory.entries,
          rootDir,
        }),
        [
          {
            cycle: ["src/a.ts", "src/b.ts", "src/a.ts"],
            reason: "Product production modules must form an acyclic dependency graph.",
            repoPath: "src/a.ts",
          },
        ],
      );
    },
  );
});

test("reports the shortest complete indirect cycle", async () => {
  await withDependencyFixture(
    {
      "src/a.ts": 'import "./b";\n',
      "src/b.ts": 'import "./c";\n',
      "src/c.ts": 'import "./a";\n',
      "src/long-a.ts": 'import "./long-b";\n',
      "src/long-b.ts": 'import "./long-c";\n',
      "src/long-c.ts": 'import "./long-d";\n',
      "src/long-d.ts": 'import "./long-a";\n',
    },
    async ({ inventory, rootDir }) => {
      const [violation] = getToolcraftProductDependencyCycleViolations({
        entries: inventory.entries,
        rootDir,
      });
      assert.deepEqual(violation.cycle, [
        "src/a.ts",
        "src/b.ts",
        "src/c.ts",
        "src/a.ts",
      ]);
    },
  );
});

test("resolves configured tsconfig aliases", async () => {
  await withDependencyFixture(
    {
      "src/a.ts": 'import "@/features/b";\n',
      "src/features/b.ts": 'import "#/a";\n',
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          paths: { "#/*": ["./src/*"], "@/*": ["./src/*"] },
        },
      }),
    },
    async ({ inventory, rootDir }) => {
      const aliases = await loadToolcraftLocalModuleAliases({
        rootDir,
        tsconfigPaths: ["tsconfig.json"],
      });
      assert.deepEqual(
        getToolcraftProductDependencyCycleViolations({
          aliases,
          entries: inventory.entries,
          rootDir,
        })[0].cycle,
        ["src/a.ts", "src/features/b.ts", "src/a.ts"],
      );
    },
  );
});

test("resolves directory index modules", async () => {
  await withDependencyFixture(
    {
      "src/a.ts": 'import "./feature";\n',
      "src/feature/index.ts": 'export { value } from "../a";\n',
    },
    async ({ inventory, rootDir }) => {
      assert.deepEqual(
        getToolcraftProductDependencyCycleViolations({
          entries: inventory.entries,
          rootDir,
        })[0].cycle,
        ["src/a.ts", "src/feature/index.ts", "src/a.ts"],
      );
    },
  );
});

test("resolves local package exports", async () => {
  await withDependencyFixture(
    {
      "packages/local/package.json": JSON.stringify({
        exports: {
          import: "./src/index.ts",
          types: "./src/index.ts",
        },
        name: "@fixture/local",
      }),
      "packages/local/src/index.ts": 'import "../../../src/a";\n',
      "src/a.ts": 'import "@fixture/local";\n',
    },
    async ({ inventory, rootDir }) => {
      const aliases = await loadToolcraftLocalModuleAliases({
        packageDirectories: ["packages/local"],
        rootDir,
      });
      assert.deepEqual(
        getToolcraftProductDependencyCycleViolations({
          aliases,
          entries: inventory.entries,
          rootDir,
        })[0].cycle,
        [
          "packages/local/src/index.ts",
          "src/a.ts",
          "packages/local/src/index.ts",
        ],
      );
    },
    { sourceRoots: ["packages", "src"] },
  );
});

test("ignores external packages, type-only imports, tests, and copied framework internals", async () => {
  await withDependencyFixture(
    {
      "src/a.ts": [
        'import type { B } from "./b";',
        'import React from "react";',
        'import "./toolcraft/runtime";',
        "export const value: B | null = null;",
      ].join("\n"),
      "src/a.test.ts": 'import "./a";\nimport "./test-helper";\n',
      "src/b.ts": 'import type { A } from "./a";\nexport type B = A;\n',
      "src/c.ts": 'export { type D } from "./d";\nexport type C = string;\n',
      "src/d.ts": 'export { type C } from "./c";\nexport type D = string;\n',
      "src/test-helper.ts": 'import "./a.test";\n',
      "src/toolcraft/runtime.ts": 'import "../a";\n',
    },
    async ({ inventory, rootDir }) => {
      assert.deepEqual(
        getToolcraftProductDependencyCycleViolations({
          entries: inventory.entries,
          rootDir,
        }),
        [],
      );
    },
  );
});
