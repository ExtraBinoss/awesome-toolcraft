import ts from "typescript";

import {
  isNestedToolcraftStringComposition,
  isToolcraftStringCompositionNode,
  createToolcraftStaticStringResolver,
} from "./toolcraft-static-string.mjs";
import {
  createSourceFile,
  getNodeLocation,
} from "./toolcraft-product-boundary-ast-utils.mjs";

export function inspectToolcraftReservedEvidenceAccess({
  absolutePath,
  rawSource,
  repoPath,
}) {
  const sourceFile = createSourceFile(absolutePath, rawSource);
  const resolveStaticString = createToolcraftStaticStringResolver(sourceFile);
  const violations = [];
  const reportedLocations = new Set();

  function visit(node) {
    if (
      isToolcraftStringCompositionNode(node) &&
      !isNestedToolcraftStringComposition(node)
    ) {
      const staticValue = resolveStaticString(node);
      const isReservedModule =
        typeof staticValue === "string" &&
        (/(?:^|\/)browser-runtime-evidence(?:\.[cm]?[jt]s)?$/u.test(staticValue) ||
          /(?:^|\/)test-evidence\/browser-runtime-contract(?:\.[cm]?[jt]s)?$/u.test(
            staticValue,
          ));
      const isReservedPayload =
        staticValue === "toolcraft.browser-runtime-evidence" ||
        staticValue ===
          "application/vnd.toolcraft.browser-runtime-evidence+json";
      const locationKey = `${node.getStart(sourceFile)}:${node.end}`;
      if (
        (isReservedModule || isReservedPayload) &&
        !reportedLocations.has(locationKey)
      ) {
        reportedLocations.add(locationKey);
        violations.push({
          ...getNodeLocation(sourceFile, node),
          kind: "reserved-runtime-evidence",
          message:
            "Product-owned source must use protected observable, export, fixture, interaction, and budget helpers; it must not import, bridge, or forge the reserved runtime evidence channel.",
          repoPath,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

export function inspectToolcraftModuleLoading({
  absolutePath,
  rawSource,
  repoPath,
}) {
  const sourceFile = createSourceFile(absolutePath, rawSource);
  const resolveStaticString = createToolcraftStaticStringResolver(sourceFile);
  const violations = [];

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
      node.arguments.length > 0 &&
      resolveStaticString(node.arguments[0]) === undefined
    ) {
      violations.push({
        ...getNodeLocation(sourceFile, node.arguments[0]),
        kind: "non-static-module-specifier",
        message:
          "Product import() and require() calls must use a statically resolvable string so the Toolcraft source boundary can verify the loaded module.",
        repoPath,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}
