import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const appDir = dirname(fileURLToPath(import.meta.url));

export function sourceDefinesProductCanvasContent(): boolean {
  const compositionPath = [
    join(appDir, "app-composition.tsx"),
    join(appDir, "app-composition.tsx"),
  ].find(existsSync);
  if (!compositionPath) return false;

  const sourceFile = ts.createSourceFile(
    compositionPath,
    readFileSync(compositionPath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let definesProductCanvas = false;

  function visit(node: ts.Node): void {
    if (ts.isPropertyAssignment(node)) {
      const propertyName = ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name)
        ? node.name.text
        : undefined;
      if (
        propertyName === "canvasContent" ||
        (propertyName === "renderDefaultCanvasMedia" &&
          node.initializer.kind === ts.SyntaxKind.FalseKeyword)
      ) {
        definesProductCanvas = true;
      }
    }
    if (!definesProductCanvas) ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return definesProductCanvas;
}
