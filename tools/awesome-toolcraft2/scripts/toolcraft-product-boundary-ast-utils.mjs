import ts from "typescript";

function getScriptKind(filePath) {
  if (/\.tsx$/iu.test(filePath)) return ts.ScriptKind.TSX;
  if (/\.jsx$/iu.test(filePath)) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/iu.test(filePath)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

export function createSourceFile(absolutePath, rawSource) {
  return ts.createSourceFile(
    absolutePath,
    rawSource,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(absolutePath),
  );
}

export function getNodeLocation(sourceFile, node) {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { column: location.character + 1, line: location.line + 1 };
}
