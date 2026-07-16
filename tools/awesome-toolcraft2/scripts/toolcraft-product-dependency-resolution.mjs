import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
let compilerLoadAttempted = false;
let typescriptCompiler;

function getTypeScriptCompiler() {
  if (compilerLoadAttempted) return typescriptCompiler;
  compilerLoadAttempted = true;
  try {
    const importedCompiler = require("typescript");
    typescriptCompiler = importedCompiler.default ?? importedCompiler;
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND") throw error;
  }
  return typescriptCompiler;
}

export function isToolcraftDependencyCompilerAvailable() {
  return Boolean(getTypeScriptCompiler());
}

export const toolcraftModuleExtensions = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];

const javascriptToTypeScriptExtensions = new Map([
  [".js", [".ts", ".tsx"]],
  [".jsx", [".tsx", ".ts"]],
  [".mjs", [".mts"]],
  [".cjs", [".cts"]],
]);

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function scriptKind(filePath, ts) {
  if (/\.tsx$/iu.test(filePath)) return ts.ScriptKind.TSX;
  if (/\.jsx$/iu.test(filePath)) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/iu.test(filePath)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function importDeclarationIsTypeOnly(node, ts) {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  if (clause.name || !clause.namedBindings) return false;
  return (
    ts.isNamedImports(clause.namedBindings) &&
    clause.namedBindings.elements.length > 0 &&
    clause.namedBindings.elements.every((element) => element.isTypeOnly)
  );
}

function exportDeclarationIsTypeOnly(node, ts) {
  if (node.isTypeOnly) return true;
  return (
    node.exportClause &&
    ts.isNamedExports(node.exportClause) &&
    node.exportClause.elements.length > 0 &&
    node.exportClause.elements.every((element) => element.isTypeOnly)
  );
}

export function collectToolcraftStaticModuleSpecifiers(filePath, source) {
  const ts = getTypeScriptCompiler();
  if (!ts) return [];
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(filePath, ts),
  );
  const specifiers = new Set();

  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      !importDeclarationIsTypeOnly(node, ts) &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.add(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      !exportDeclarationIsTypeOnly(node, ts) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.add(node.moduleSpecifier.text);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      specifiers.add(node.moduleReference.expression.text);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      specifiers.add(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...specifiers].sort(compareCodeUnits);
}

function getExportTarget(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  for (const key of ["types", "default", "import", "browser", "development"]) {
    const target = getExportTarget(value[key]);
    if (target) return target;
  }
  return null;
}

function getPackageExportEntries(exportsField) {
  if (typeof exportsField === "string") return [[".", exportsField]];
  if (!exportsField || typeof exportsField !== "object" || Array.isArray(exportsField)) {
    return [];
  }
  const entries = Object.entries(exportsField);
  return entries.some(([key]) => key.startsWith("."))
    ? entries.filter(([key]) => key.startsWith("."))
    : [[".", exportsField]];
}

export async function loadToolcraftLocalModuleAliases({
  packageDirectories = [],
  rootDir,
  tsconfigPaths = [],
}) {
  const aliases = [];
  const ts = getTypeScriptCompiler();
  if (ts) {
    for (const configEntry of tsconfigPaths) {
      const relativeConfigPath =
        typeof configEntry === "string" ? configEntry : configEntry.path;
      const importerPrefix =
        typeof configEntry === "string" ? undefined : configEntry.importerPrefix;
      const configPath = path.resolve(rootDir, relativeConfigPath);
      const result = ts.readConfigFile(configPath, ts.sys.readFile);
      if (result.error) continue;
      const compilerOptions = result.config.compilerOptions ?? {};
      const baseDir = path.resolve(
        path.dirname(configPath),
        compilerOptions.baseUrl ?? ".",
      );
      for (const [match, replacements] of Object.entries(
        compilerOptions.paths ?? {},
      )) {
        for (const replacement of replacements) {
          aliases.push({
            ...(importerPrefix ? { importerPrefix } : {}),
            match,
            replacement: path.resolve(baseDir, replacement),
          });
        }
      }
    }
  }

  for (const relativePackageDir of packageDirectories) {
    const packageDir = path.resolve(rootDir, relativePackageDir);
    let packageJson;
    try {
      packageJson = JSON.parse(
        await fs.readFile(path.join(packageDir, "package.json"), "utf8"),
      );
    } catch {
      continue;
    }
    if (typeof packageJson.name !== "string") continue;
    for (const [exportKey, exportValue] of getPackageExportEntries(
      packageJson.exports,
    )) {
      const target = getExportTarget(exportValue);
      if (!target) continue;
      aliases.push({
        match:
          exportKey === "."
            ? packageJson.name
            : `${packageJson.name}/${exportKey.replace(/^\.\//u, "")}`,
        replacement: path.resolve(packageDir, target),
      });
    }
  }

  return aliases.sort(
    (left, right) =>
      right.match.length - left.match.length ||
      compareCodeUnits(left.match, right.match),
  );
}

function aliasCandidates(specifier, importerRepoPath, aliases) {
  const candidates = [];
  for (const alias of aliases) {
    if (alias.importerPrefix && !importerRepoPath.startsWith(alias.importerPrefix)) {
      continue;
    }
    const wildcardIndex = alias.match.indexOf("*");
    if (wildcardIndex < 0) {
      if (specifier === alias.match) candidates.push(alias.replacement);
      continue;
    }
    const prefix = alias.match.slice(0, wildcardIndex);
    const suffix = alias.match.slice(wildcardIndex + 1);
    if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
    const wildcardValue = specifier.slice(
      prefix.length,
      specifier.length - suffix.length,
    );
    candidates.push(alias.replacement.replace("*", wildcardValue));
  }
  return candidates;
}

function resolveModuleCandidate(basePath, entryByAbsolutePath) {
  const normalizedBase = path.resolve(basePath);
  const candidates = [normalizedBase];
  const extension = path.extname(normalizedBase);
  if (!extension) {
    candidates.push(
      ...toolcraftModuleExtensions.map((item) => `${normalizedBase}${item}`),
      ...toolcraftModuleExtensions.map((item) =>
        path.join(normalizedBase, `index${item}`),
      ),
    );
  } else {
    for (const replacement of javascriptToTypeScriptExtensions.get(extension) ?? []) {
      candidates.push(`${normalizedBase.slice(0, -extension.length)}${replacement}`);
    }
  }
  return candidates.find((candidate) => entryByAbsolutePath.has(candidate));
}

export function resolveToolcraftLocalDependency({
  aliases,
  entryByAbsolutePath,
  importer,
  rootDir,
  specifier,
}) {
  const withoutQuery = specifier.replace(/\?.*$/u, "");
  const cleanSpecifier = withoutQuery.startsWith("#")
    ? withoutQuery
    : withoutQuery.replace(/#.*$/u, "");
  const baseCandidates = cleanSpecifier.startsWith(".")
    ? [path.resolve(path.dirname(importer.absolutePath), cleanSpecifier)]
    : cleanSpecifier.startsWith("/")
      ? [path.resolve(rootDir, `.${cleanSpecifier}`)]
      : aliasCandidates(cleanSpecifier, importer.repoPath, aliases);

  for (const basePath of baseCandidates) {
    const resolved = resolveModuleCandidate(basePath, entryByAbsolutePath);
    if (resolved) return resolved;
  }
  return undefined;
}
