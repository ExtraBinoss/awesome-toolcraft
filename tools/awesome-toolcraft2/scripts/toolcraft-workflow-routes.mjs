import fs from "node:fs/promises";
import path from "node:path";

export const toolcraftWorkflowPhaseLineBudget = 600;
export const toolcraftWorkflowDocumentCharacterBudget = 40_000;

export const toolcraftWorkflowPhaseIds = Object.freeze([
  "plan",
  "implementation",
  "verification",
]);

function defineRoute(route) {
  return Object.freeze({
    ...route,
    phases: Object.freeze(
      Object.fromEntries(
        toolcraftWorkflowPhaseIds.map((phaseId) => [
          phaseId,
          Object.freeze([...route.phases[phaseId]]),
        ]),
      ),
    ),
  });
}

export const toolcraftWorkflowRoutes = Object.freeze(
  [
    {
      id: "app-assembly",
      task: "App assembly, route structure, generated app porting",
      phases: {
        plan: ["core/runtime-boundary.md", "assembly-workflow.md"],
        implementation: ["decision-contract.md"],
        verification: ["acceptance-testing.md"],
      },
    },
    {
      id: "reference-study",
      task: "Reference app study, audit, or port",
      phases: {
        plan: [
          "core/reference-study.md",
          "core/runtime-boundary.md",
          "assembly-workflow.md",
        ],
        implementation: ["schema-reference.md", "decision-contract.md"],
        verification: ["acceptance-testing.md"],
      },
    },
    {
      id: "schema-controls",
      task: "Schema, controls, defaults, persistence, actions",
      phases: {
        plan: ["core/control-selection.md", "core/layout.md"],
        implementation: ["schema-reference.md", "component-rules.md"],
        verification: ["acceptance-testing.md"],
      },
    },
    {
      id: "custom-controls",
      task: "Custom controls",
      phases: {
        plan: ["core/control-selection.md", "core/layout.md"],
        implementation: ["custom-controls.md", "component-rules.md"],
        verification: ["acceptance-testing.md"],
      },
    },
    {
      id: "renderer-canvas",
      task: "Renderer, canvas output, visual technique",
      phases: {
        plan: ["core/runtime-boundary.md", "core/performance.md"],
        implementation: ["renderer-technique.md", "performance.md"],
        verification: ["acceptance-testing.md"],
      },
    },
    {
      id: "timeline-animation",
      task: "Timeline, keyframes, animation transport",
      phases: {
        plan: ["core/timeline-animation.md", "core/performance.md"],
        implementation: ["decision-contract.md", "component-rules.md"],
        verification: ["acceptance-testing.md"],
      },
    },
    {
      id: "layers",
      task: "Layers",
      phases: {
        plan: ["core/runtime-boundary.md", "core/layout.md"],
        implementation: ["decision-contract.md", "component-rules.md"],
        verification: ["acceptance-testing.md"],
      },
    },
    {
      id: "export-media",
      task: "Export, copy, media, background",
      phases: {
        plan: ["core/setup-export.md", "core/media-upload.md"],
        implementation: ["schema-reference.md", "component-rules.md"],
        verification: ["acceptance-testing.md", "performance.md"],
      },
    },
    {
      id: "debug-repair",
      task: "Broken control, visual mismatch, failed build, export bug, performance issue",
      phases: {
        plan: ["decision-contract.md", "core/runtime-boundary.md"],
        implementation: ["component-rules.md", "renderer-technique.md"],
        verification: ["acceptance-testing.md", "performance.md"],
      },
    },
    {
      id: "figma-implementation",
      task: "Figma implementation",
      phases: {
        plan: [
          "core/reference-study.md",
          "core/runtime-boundary.md",
          "assembly-workflow.md",
        ],
        implementation: ["schema-reference.md", "component-rules.md"],
        verification: ["acceptance-testing.md"],
      },
    },
  ].map(defineRoute),
);

export const toolcraftWorkflowRequiredDocPaths = Object.freeze(
  [
    ...new Set(
      toolcraftWorkflowRoutes.flatMap((route) =>
        toolcraftWorkflowPhaseIds.flatMap(
          (phaseId) => route.phases[phaseId],
        ),
      ),
    ),
  ].sort(),
);

export const toolcraftWorkflowRouteStartMarker =
  "[//]: # (toolcraft-workflow-routes:start)";
export const toolcraftWorkflowRouteEndMarker =
  "[//]: # (toolcraft-workflow-routes:end)";

function renderLocalDocPath(relativePath) {
  return `\`${relativePath}\``;
}

function renderDocList(paths, renderDocPath, docSeparator) {
  return paths.map(renderDocPath).join(docSeparator);
}

export function renderToolcraftWorkflowRouteFragment(
  routes = toolcraftWorkflowRoutes,
  {
    docSeparator = "<br>",
    endMarker = toolcraftWorkflowRouteEndMarker,
    renderDocPath = renderLocalDocPath,
    startMarker = toolcraftWorkflowRouteStartMarker,
  } = {},
) {
  const lines = [
    startMarker,
    "| Task route | Plan phase | Implementation phase | Verification phase |",
    "| --- | --- | --- | --- |",
    ...routes.map(
      (route) =>
        `| ${route.task} | ${renderDocList(route.phases.plan, renderDocPath, docSeparator)} | ${renderDocList(route.phases.implementation, renderDocPath, docSeparator)} | ${renderDocList(route.phases.verification, renderDocPath, docSeparator)} |`,
    ),
    endMarker,
  ];

  return lines.join("\n");
}

function countSourceLines(source) {
  const normalizedSource = source.replace(/\r\n/gu, "\n").replace(/\n$/u, "");
  return normalizedSource.length === 0 ? 0 : normalizedSource.split("\n").length;
}

export function getToolcraftWorkflowRouteFragmentFailure({
  docSeparator = "<br>",
  endMarker = toolcraftWorkflowRouteEndMarker,
  label = "docs/toolcraft/workflow.md",
  renderDocPath = renderLocalDocPath,
  routes = toolcraftWorkflowRoutes,
  source,
  startMarker = toolcraftWorkflowRouteStartMarker,
}) {
  const startIndex = source.indexOf(startMarker);
  const endIndex = source.indexOf(endMarker);
  const hasDuplicateStart =
    startIndex >= 0 &&
    source.indexOf(startMarker, startIndex + 1) >= 0;
  const hasDuplicateEnd =
    endIndex >= 0 &&
    source.indexOf(endMarker, endIndex + 1) >= 0;

  if (
    startIndex < 0 ||
    endIndex < startIndex ||
    hasDuplicateStart ||
    hasDuplicateEnd
  ) {
    return `${label} must contain one ordered workflow route fragment`;
  }

  const fragmentEnd = endIndex + endMarker.length;
  const actualFragment = source.slice(startIndex, fragmentEnd);
  const expectedFragment = renderToolcraftWorkflowRouteFragment(routes, {
    docSeparator,
    endMarker,
    renderDocPath,
    startMarker,
  });

  return actualFragment === expectedFragment
    ? null
    : `${label} workflow route fragment is out of sync`;
}

export async function getToolcraftWorkflowRouteFailures({
  documentCharacterBudget = toolcraftWorkflowDocumentCharacterBudget,
  projectRoot,
  workflowSource,
  routes = toolcraftWorkflowRoutes,
  requiredDocPaths = toolcraftWorkflowRequiredDocPaths,
  phaseLineBudget = toolcraftWorkflowPhaseLineBudget,
}) {
  const failures = [];
  const routeIds = new Set();
  const routedDocPaths = new Set();
  const checkedDocumentPaths = new Set();
  const sourceByPath = new Map();

  const exactFragmentFailure = getToolcraftWorkflowRouteFragmentFailure({
    routes,
    source: workflowSource,
  });
  if (exactFragmentFailure) failures.push(exactFragmentFailure);

  for (const route of routes) {
    if (!route.id || routeIds.has(route.id)) {
      failures.push(`workflow route id must be unique: ${route.id || "<missing>"}`);
    }
    routeIds.add(route.id);

    for (const phaseId of toolcraftWorkflowPhaseIds) {
      const phasePaths = route.phases?.[phaseId];

      if (!Array.isArray(phasePaths) || phasePaths.length === 0) {
        failures.push(`workflow route ${route.id} must define ${phaseId} docs`);
        continue;
      }

      if (new Set(phasePaths).size !== phasePaths.length) {
        failures.push(
          `workflow route ${route.id} repeats a document in the ${phaseId} phase`,
        );
      }

      let phaseLineCount = 0;

      for (const relativePath of phasePaths) {
        routedDocPaths.add(relativePath);
        let source = sourceByPath.get(relativePath);

        if (source === undefined) {
          try {
            source = await fs.readFile(
              path.join(projectRoot, "docs/toolcraft", relativePath),
              "utf8",
            );
            sourceByPath.set(relativePath, source);
          } catch (error) {
            if (error?.code !== "ENOENT") throw error;
            source = null;
            sourceByPath.set(relativePath, source);
            failures.push(`workflow route document is missing: ${relativePath}`);
          }
        }

        if (source !== null) {
          phaseLineCount += countSourceLines(source);

          if (!checkedDocumentPaths.has(relativePath)) {
            checkedDocumentPaths.add(relativePath);
            if (source.length > documentCharacterBudget) {
              failures.push(
                `workflow route document ${relativePath} is ${source.length} characters; budget is ${documentCharacterBudget}`,
              );
            }
          }
        }
      }

      if (phaseLineCount > phaseLineBudget) {
        failures.push(
          `workflow route ${route.id} ${phaseId} phase is ${phaseLineCount} lines; budget is ${phaseLineBudget}`,
        );
      }
    }
  }

  for (const relativePath of requiredDocPaths) {
    if (!routedDocPaths.has(relativePath)) {
      failures.push(`required workflow document is not routed: ${relativePath}`);
    }
  }

  return failures;
}
