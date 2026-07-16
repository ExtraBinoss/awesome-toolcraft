import ts from "typescript";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

function compoundNodeHasLocalClass(node) {
  if (node.type === "class") return true;
  if (node.type !== "pseudo") return false;

  if ([":is", ":where"].includes(node.value)) {
    return Boolean(
      node.nodes?.length > 0 &&
        node.nodes.every(
          (branch) =>
            branch.type === "selector" &&
            selectorFirstCompoundHasLocalClass(branch),
        ),
    );
  }

  if (node.value !== ":local") return false;

  let hasLocalClass = false;
  node.walkClasses(() => {
    hasLocalClass = true;
  });
  return hasLocalClass;
}

function selectorFirstCompoundHasLocalClass(selector) {
  for (const node of selector.nodes) {
    if (node.type === "combinator") break;
    if (compoundNodeHasLocalClass(node)) return true;
  }
  return false;
}

function inspectSiblingEscapes(selector, reasons, displaySelector = selector) {
  let currentCompoundHasLocalClass = false;
  let pendingSiblingCombinator;

  for (const node of selector.nodes) {
    if (node.type === "combinator") {
      if (pendingSiblingCombinator && !currentCompoundHasLocalClass) {
        reasons.push(
          `selector "${displaySelector}" escapes through sibling combinator ${pendingSiblingCombinator}`,
        );
      }

      const combinator = node.value.trim();
      pendingSiblingCombinator =
        combinator === "+" || combinator === "~" ? combinator : undefined;
      currentCompoundHasLocalClass = false;
      continue;
    }

    if (compoundNodeHasLocalClass(node)) {
      currentCompoundHasLocalClass = true;
    }

    if (node.type === "pseudo") {
      for (const branch of node.nodes ?? []) {
        if (branch.type === "selector") {
          inspectSiblingEscapes(branch, reasons, displaySelector);
        }
      }
    }
  }

  if (pendingSiblingCombinator && !currentCompoundHasLocalClass) {
    reasons.push(
      `selector "${displaySelector}" escapes through sibling combinator ${pendingSiblingCombinator}`,
    );
  }
}

function getNodeLocation(sourceFile, node) {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { column: location.character + 1, line: location.line + 1 };
}

export function inspectToolcraftProductCss({ rawSource, repoPath }) {
  const isCssModule = /\.module\.css$/iu.test(repoPath);
  const reasons = [];

  if (!isCssModule) reasons.push("the file is not a CSS Module");

  try {
    const root = postcss.parse(rawSource, { from: repoPath });
    root.walkAtRules("import", () => {
      reasons.push("CSS @import can pull unscoped styles into the product bundle");
    });
    root.walkRules((rule) => {
      selectorParser((selectors) => {
        selectors.each((selector) => {
          inspectSiblingEscapes(selector, reasons);

          selector.walk((node) => {
            if (node.type === "pseudo" && node.value === ":global") {
              reasons.push(`selector "${selector}" uses :global`);
            }
            if (
              (node.type === "tag" && ["body", "html"].includes(node.value.toLowerCase())) ||
              (node.type === "id" && node.value === "root") ||
              (node.type === "pseudo" && node.value === ":root")
            ) {
              reasons.push(`selector "${selector}" targets a document root`);
            }
            if (
              node.type === "attribute" &&
              ((node.attribute === "data-slot" && /^toolcraft-/u.test(node.value ?? "")) ||
                (node.attribute.startsWith("data-toolcraft-") &&
                  !["data-toolcraft-product-output", "data-toolcraft-product-text"].includes(
                    node.attribute,
                  )))
            ) {
              reasons.push(`selector "${selector}" targets a Toolcraft host attribute`);
            }
          });

          if (!selectorFirstCompoundHasLocalClass(selector)) {
            reasons.push(`selector "${selector}" is not anchored to a local class`);
          }
        });
      }).processSync(rule.selector);
    });
  } catch (error) {
    reasons.push(
      `CSS could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (reasons.length === 0) return [];

  return [{
    column: 1,
    kind: "product-global-css",
    line: 1,
    message:
      `Product styles must use selector-local *.module.css rules and must not escape into the signed Toolcraft host. ${[...new Set(reasons)].join("; ")}.`,
    repoPath,
  }];
}

export function inspectToolcraftProductStyleNode({
  node,
  repoPath,
  resolveStaticString,
  sourceFile,
}) {
  const violations = [];
  const isStyleElement =
    (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
    node.tagName.getText(sourceFile) === "style";
  const createsStyleElement =
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "createElement" &&
    node.arguments[0] &&
    ts.isStringLiteralLike(node.arguments[0]) &&
    node.arguments[0].text.toLowerCase() === "style";
  const createsStyleSheet =
    ts.isNewExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "CSSStyleSheet";

  if (isStyleElement || createsStyleElement || createsStyleSheet) {
    violations.push({
      ...getNodeLocation(sourceFile, node),
      kind: "global-style-injection",
      message:
        "Product source must not inject global style elements or stylesheets. Use a local *.module.css file so product styling cannot modify the signed Toolcraft host.",
      repoPath,
    });
  }

  let styleModuleSpecifier;
  let styleModuleNode;
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteralLike(node.moduleSpecifier)
  ) {
    styleModuleSpecifier = node.moduleSpecifier.text;
    styleModuleNode = node.moduleSpecifier;
  } else if (
    ts.isImportEqualsDeclaration(node) &&
    ts.isExternalModuleReference(node.moduleReference) &&
    node.moduleReference.expression &&
    ts.isStringLiteralLike(node.moduleReference.expression)
  ) {
    styleModuleSpecifier = node.moduleReference.expression.text;
    styleModuleNode = node.moduleReference.expression;
  } else if (
    ts.isCallExpression(node) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
    node.arguments.length > 0
  ) {
    styleModuleSpecifier = resolveStaticString?.(node.arguments[0]);
    styleModuleNode = node.arguments[0];
  }

  if (
    styleModuleSpecifier &&
    /\.(?:css|less|sass|scss|styl|stylus)(?:\?|$)/iu.test(styleModuleSpecifier) &&
    (!/\.module\.css(?:\?|$)/iu.test(styleModuleSpecifier) ||
      !/^(?:\.|@\/|#\/|\/src\/)/u.test(styleModuleSpecifier))
  ) {
    violations.push({
      ...getNodeLocation(sourceFile, styleModuleNode),
      kind: "product-global-css-import",
      message:
        "Product source may import only local *.module.css styles. Package or plain CSS imports can restyle the signed Toolcraft host.",
      repoPath,
    });
  }

  return violations;
}
