import ts from "typescript";

function isConstVariableDeclaration(node) {
  return (
    ts.isVariableDeclaration(node) &&
    ts.isVariableDeclarationList(node.parent) &&
    (node.parent.flags & ts.NodeFlags.Const) !== 0 &&
    ts.isIdentifier(node.name) &&
    node.initializer
  );
}

function createTypeChecker(sourceFile) {
  const compilerOptions = {
    allowJs: true,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  };
  const defaultHost = ts.createCompilerHost(compilerOptions);
  const host = {
    ...defaultHost,
    fileExists: (fileName) => fileName === sourceFile.fileName,
    getSourceFile: (fileName) =>
      fileName === sourceFile.fileName ? sourceFile : undefined,
    readFile: (fileName) =>
      fileName === sourceFile.fileName ? sourceFile.text : undefined,
    writeFile: () => undefined,
  };

  return ts
    .createProgram([sourceFile.fileName], compilerOptions, host)
    .getTypeChecker();
}

export function createToolcraftStaticStringResolver(sourceFile) {
  const checker = createTypeChecker(sourceFile);

  function resolve(node, resolvingDeclarations = new Set()) {
    if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }

    if (ts.isParenthesizedExpression(node)) {
      return resolve(node.expression, resolvingDeclarations);
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      const left = resolve(node.left, resolvingDeclarations);
      const right = resolve(node.right, resolvingDeclarations);
      return left === undefined || right === undefined ? undefined : left + right;
    }

    if (ts.isTemplateExpression(node)) {
      let value = node.head.text;
      for (const span of node.templateSpans) {
        const expressionValue = resolve(span.expression, resolvingDeclarations);
        if (expressionValue === undefined) return undefined;
        value += expressionValue + span.literal.text;
      }
      return value;
    }

    if (ts.isIdentifier(node)) {
      const declaration = checker
        .getSymbolAtLocation(node)
        ?.declarations?.find(isConstVariableDeclaration);
      if (!declaration || resolvingDeclarations.has(declaration)) return undefined;
      resolvingDeclarations.add(declaration);
      const value = resolve(declaration.initializer, resolvingDeclarations);
      resolvingDeclarations.delete(declaration);
      return value;
    }

    return undefined;
  }

  return resolve;
}

export function isToolcraftStringCompositionNode(node) {
  return (
    ts.isStringLiteralLike(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    (ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken)
  );
}

export function isNestedToolcraftStringComposition(node) {
  const parent = node.parent;
  return Boolean(
    parent &&
      (ts.isParenthesizedExpression(parent) ||
        ts.isTemplateSpan(parent) ||
        (ts.isBinaryExpression(parent) &&
          parent.operatorToken.kind === ts.SyntaxKind.PlusToken)),
  );
}
