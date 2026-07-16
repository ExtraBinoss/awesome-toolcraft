import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  getToolcraftWorkflowRouteFragmentFailure,
  getToolcraftWorkflowRouteFailures,
  renderToolcraftWorkflowRouteFragment,
  toolcraftWorkflowPhaseIds,
  toolcraftWorkflowRoutes,
} from "./toolcraft-workflow-routes.mjs";

const starterRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function defineFixtureRoute(pathsByPhase) {
  return [
    {
      id: "fixture",
      task: "Fixture",
      phases: pathsByPhase,
    },
  ];
}

async function createFixture(docs) {
  const projectRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "toolcraft-workflow-routes-"),
  );

  await Promise.all(
    Object.entries(docs).map(async ([relativePath, source]) => {
      const targetPath = path.join(
        projectRoot,
        "docs/toolcraft",
        relativePath,
      );
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, source);
    }),
  );

  return projectRoot;
}

test("keeps the canonical workflow fragment, files, and phase budgets valid", async () => {
  const workflowSource = await fs.readFile(
    path.join(starterRoot, "docs/toolcraft/workflow.md"),
    "utf8",
  );
  const failures = await getToolcraftWorkflowRouteFailures({
    projectRoot: starterRoot,
    workflowSource,
  });

  assert.deepEqual(failures, []);
  assert.match(
    workflowSource,
    /Open exactly one listed document per terminal or tool read/u,
  );
  for (const phaseId of toolcraftWorkflowPhaseIds) {
    assert.ok(workflowSource.includes(`${phaseId[0].toUpperCase()}${phaseId.slice(1)} phase`));
  }
});

test("rejects a workflow fragment that drifts from the route policy", async () => {
  const canonicalFragment = renderToolcraftWorkflowRouteFragment();
  const failures = await getToolcraftWorkflowRouteFailures({
    projectRoot: starterRoot,
    workflowSource: canonicalFragment.replace("App assembly", "Manual assembly"),
  });

  assert.ok(failures.some((failure) => failure.includes("out of sync")));
});

test("renders and validates alternate workflow presentations from the same routes", () => {
  const renderDocPath = (relativePath) =>
    `[${relativePath}](/docs/${relativePath.replace(/\.md$/u, "")})`;
  const fragment = renderToolcraftWorkflowRouteFragment(
    toolcraftWorkflowRoutes,
    { docSeparator: "<br />", renderDocPath },
  );

  assert.match(
    fragment,
    /\[core\/reference-study\.md\]\(\/docs\/core\/reference-study\)<br \/>\[core\/runtime-boundary\.md\]/u,
  );
  assert.equal(
    getToolcraftWorkflowRouteFragmentFailure({
      label: "website workflow",
      docSeparator: "<br />",
      renderDocPath,
      routes: toolcraftWorkflowRoutes,
      source: fragment,
    }),
    null,
  );
  assert.match(
    getToolcraftWorkflowRouteFragmentFailure({
      label: "website workflow",
      docSeparator: "<br />",
      renderDocPath,
      routes: toolcraftWorkflowRoutes,
      source: fragment.replace("App assembly", "Manual assembly"),
    }),
    /website workflow workflow route fragment is out of sync/u,
  );
});

test("rejects missing route documents", async (context) => {
  const projectRoot = await createFixture({ "present.md": "present\n" });
  context.after(() => fs.rm(projectRoot, { force: true, recursive: true }));
  const routes = defineFixtureRoute({
    plan: ["present.md"],
    implementation: ["missing.md"],
    verification: ["present.md"],
  });
  const failures = await getToolcraftWorkflowRouteFailures({
    projectRoot,
    workflowSource: renderToolcraftWorkflowRouteFragment(routes),
    routes,
    requiredDocPaths: ["present.md", "missing.md"],
  });

  assert.ok(
    failures.includes("workflow route document is missing: missing.md"),
  );
});

test("rejects required detailed documents that no workflow route reads", async (context) => {
  const projectRoot = await createFixture({
    "orphan.md": "orphan\n",
    "present.md": "present\n",
  });
  context.after(() => fs.rm(projectRoot, { force: true, recursive: true }));
  const routes = defineFixtureRoute({
    plan: ["present.md"],
    implementation: ["present.md"],
    verification: ["present.md"],
  });
  const failures = await getToolcraftWorkflowRouteFailures({
    projectRoot,
    workflowSource: renderToolcraftWorkflowRouteFragment(routes),
    routes,
    requiredDocPaths: ["present.md", "orphan.md"],
  });

  assert.ok(
    failures.includes("required workflow document is not routed: orphan.md"),
  );
});

test("rejects a route phase that exceeds its reading budget", async (context) => {
  const projectRoot = await createFixture({
    "long.md": "one\ntwo\nthree\nfour\nfive\n",
  });
  context.after(() => fs.rm(projectRoot, { force: true, recursive: true }));
  const routes = defineFixtureRoute({
    plan: ["long.md"],
    implementation: ["long.md"],
    verification: ["long.md"],
  });
  const failures = await getToolcraftWorkflowRouteFailures({
    projectRoot,
    workflowSource: renderToolcraftWorkflowRouteFragment(routes),
    routes,
    requiredDocPaths: ["long.md"],
    phaseLineBudget: 4,
  });

  assert.equal(
    failures.filter((failure) => failure.includes("budget is 4")).length,
    3,
  );
});

test("rejects an oversized individual document even when its phase line count is small", async (context) => {
  const projectRoot = await createFixture({
    "long-line.md": "1234567890\n",
  });
  context.after(() => fs.rm(projectRoot, { force: true, recursive: true }));
  const routes = defineFixtureRoute({
    plan: ["long-line.md"],
    implementation: ["long-line.md"],
    verification: ["long-line.md"],
  });
  const failures = await getToolcraftWorkflowRouteFailures({
    documentCharacterBudget: 8,
    phaseLineBudget: 10,
    projectRoot,
    requiredDocPaths: ["long-line.md"],
    routes,
    workflowSource: renderToolcraftWorkflowRouteFragment(routes),
  });

  assert.deepEqual(failures, [
    "workflow route document long-line.md is 11 characters; budget is 8",
  ]);
});
