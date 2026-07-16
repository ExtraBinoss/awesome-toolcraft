import fs from "node:fs";
import path from "node:path";

import {
  collectToolcraftStaticModuleSpecifiers,
  loadToolcraftLocalModuleAliases,
  resolveToolcraftLocalDependency,
  toolcraftModuleExtensions,
} from "./toolcraft-product-dependency-resolution.mjs";

export { loadToolcraftLocalModuleAliases };

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function canonicalizeCycle(cycle) {
  const nodes = cycle.slice(0, -1);
  const rotations = nodes.map((_, index) => {
    const rotated = [...nodes.slice(index), ...nodes.slice(0, index)];
    return [...rotated, rotated[0]];
  });
  return rotations.sort((left, right) =>
    compareCodeUnits(left.join("\0"), right.join("\0")),
  )[0];
}

function findStronglyConnectedComponents(adjacency) {
  const components = [];
  const indexByNode = new Map();
  const lowLinkByNode = new Map();
  const stack = [];
  const stacked = new Set();
  let nextIndex = 0;

  function visit(node) {
    indexByNode.set(node, nextIndex);
    lowLinkByNode.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    stacked.add(node);

    for (const dependency of adjacency.get(node) ?? []) {
      if (!indexByNode.has(dependency)) {
        visit(dependency);
        lowLinkByNode.set(
          node,
          Math.min(lowLinkByNode.get(node), lowLinkByNode.get(dependency)),
        );
      } else if (stacked.has(dependency)) {
        lowLinkByNode.set(
          node,
          Math.min(lowLinkByNode.get(node), indexByNode.get(dependency)),
        );
      }
    }

    if (lowLinkByNode.get(node) !== indexByNode.get(node)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      stacked.delete(member);
      component.push(member);
    } while (member !== node);
    components.push(component.sort(compareCodeUnits));
  }

  for (const node of [...adjacency.keys()].sort(compareCodeUnits)) {
    if (!indexByNode.has(node)) visit(node);
  }
  return components;
}

function reconstructCycle(predecessor, current, start) {
  const reversed = [current];
  while (reversed.at(-1) !== start) {
    reversed.push(predecessor.get(reversed.at(-1)));
  }
  return canonicalizeCycle([...reversed.reverse(), start]);
}

function findShortestCycleInComponent(adjacency, component) {
  const members = new Set(component);
  let shortest;
  for (const start of component) {
    const queue = [start];
    const predecessor = new Map([[start, null]]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      for (const dependency of adjacency.get(current) ?? []) {
        if (!members.has(dependency)) continue;
        if (dependency === start) {
          const candidate = reconstructCycle(predecessor, current, start);
          if (
            !shortest ||
            candidate.length < shortest.length ||
            (candidate.length === shortest.length &&
              compareCodeUnits(candidate.join("\0"), shortest.join("\0")) < 0)
          ) {
            shortest = candidate;
          }
          continue;
        }
        if (!predecessor.has(dependency)) {
          predecessor.set(dependency, current);
          queue.push(dependency);
        }
      }
    }
  }
  return shortest;
}

function findShortestCycles(adjacency) {
  return findStronglyConnectedComponents(adjacency)
    .filter(
      (component) =>
        component.length > 1 ||
        (adjacency.get(component[0]) ?? []).includes(component[0]),
    )
    .map((component) => findShortestCycleInComponent(adjacency, component))
    .filter(Boolean)
    .sort((left, right) => compareCodeUnits(left.join("\0"), right.join("\0")));
}

export function getToolcraftProductDependencyCycleViolations({
  aliases = [],
  entries,
  ignoredFilePatterns = [],
  includedFilePatterns = [],
  rootDir,
}) {
  const productionEntries = entries.filter(
    (entry) =>
      entry.owner === "product" &&
      entry.role === "production" &&
      toolcraftModuleExtensions.includes(path.extname(entry.repoPath)) &&
      (includedFilePatterns.length === 0 ||
        includedFilePatterns.some((pattern) => pattern.test(entry.repoPath))) &&
      !ignoredFilePatterns.some((pattern) => pattern.test(entry.repoPath)),
  );
  const entryByAbsolutePath = new Map(
    productionEntries.map((entry) => [path.resolve(entry.absolutePath), entry]),
  );
  const adjacency = new Map();

  for (const entry of productionEntries) {
    const dependencies = new Set();
    const source = fs.readFileSync(entry.absolutePath, "utf8");
    for (const specifier of collectToolcraftStaticModuleSpecifiers(
      entry.absolutePath,
      source,
    )) {
      const resolved = resolveToolcraftLocalDependency({
        aliases,
        entryByAbsolutePath,
        importer: entry,
        rootDir,
        specifier,
      });
      if (resolved) dependencies.add(entryByAbsolutePath.get(resolved).repoPath);
    }
    adjacency.set(entry.repoPath, [...dependencies].sort(compareCodeUnits));
  }

  return findShortestCycles(adjacency).map((cycle) => ({
    cycle: cycle.map(toPosixPath),
    reason: "Product production modules must form an acyclic dependency graph.",
    repoPath: cycle[0],
  }));
}
