import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { collectToolcraftSourceInventorySync } from "../../scripts/toolcraft-source-inventory.mjs";

import { sourceDefinesProductCanvasContent } from "./app-acceptance.source-test-utils";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

export const appDir = dirname(fileURLToPath(import.meta.url));
export const srcDir = join(appDir, "..");
export const routesDir = join(appDir, "../routes");
export const e2eDir = join(appDir, "../../e2e");
export const projectDir = join(appDir, "../..");

export function playwrightConfigForbidsFocusedTests(): boolean {
  const sourceFile = ts.createSourceFile(
    "playwright.config.ts",
    readFileSync(join(projectDir, "playwright.config.ts"), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  return sourceFile.statements.some((statement) => {
    if (
      !ts.isExportAssignment(statement) ||
      !ts.isCallExpression(statement.expression)
    ) {
      return false;
    }

    const config = statement.expression.arguments[0];
    if (!config || !ts.isObjectLiteralExpression(config)) {
      return false;
    }

    return config.properties.some(
      (property) =>
        ts.isPropertyAssignment(property) &&
        ((ts.isIdentifier(property.name) && property.name.text === "forbidOnly") ||
          (ts.isStringLiteralLike(property.name) && property.name.text === "forbidOnly")) &&
        property.initializer.kind === ts.SyntaxKind.TrueKeyword,
    );
  });
}

export function stripJsComments(source: string): string {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.JSX,
    source,
  );
  const chunks: string[] = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token !== ts.SyntaxKind.SingleLineCommentTrivia &&
      token !== ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      chunks.push(scanner.getTokenText());
    }
    token = scanner.scan();
  }
  return chunks.join("");
}

export function readFiles(rootDir: string, matcher: RegExp): string {
  const inventory = collectToolcraftSourceInventorySync({
    frameworkPathPrefixes: [],
    ignoredFilePatterns: [
      /(?:^|\/)(?:dist|node_modules)(?:\/|$)/u,
      /^toolcraft(?:\/|$)/u,
    ],
    rootDir,
    sourceRoots: ["."],
  });
  if (inventory.filesystemViolations.length > 0) {
    throw new Error(
      inventory.filesystemViolations
        .map((violation) => `${violation.repoPath}: ${violation.reason}`)
        .join("\n"),
    );
  }

  return inventory.entries
    .filter((entry) => entry.role === "production")
    .filter((entry) => {
      const fileName = entry.repoPath.split("/").at(-1) ?? entry.repoPath;
      if (
        /^(?:starter-|app-)(?:acceptance|performance)(?:[.-].*)?\.ts$/u.test(
          fileName,
        )
      ) {
        return false;
      }
      matcher.lastIndex = 0;
      return matcher.test(fileName);
    })
    .map((entry) => readFileSync(entry.absolutePath, "utf8"))
    .join("\n");
}

export function readMarkdownFiles(rootDir: string): string {
  if (!existsSync(rootDir)) {
    return "";
  }

  const chunks: string[] = [];

  function visit(currentDir: string) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const filePath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!["dist", "node_modules", "toolcraft"].includes(entry.name)) {
          visit(filePath);
        }
        continue;
      }

      if (entry.isFile() && /\.mdx?$/i.test(entry.name)) {
        chunks.push(readFileSync(filePath, "utf8"));
      }
    }
  }

  visit(rootDir);
  return chunks.join("\n");
}

export function readProjectDecisionSources(): string {
  return stripJsComments(
    [
      readMarkdownFiles(join(projectDir, "docs")),
      readMarkdownFiles(join(projectDir, "specs")),
      readMarkdownFiles(join(projectDir, "plans")),
    ].join("\n"),
  );
}

export function sourceUsesCustomRenderer(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));

  return (
    sourceDefinesProductCanvasContent() ||
    /useToolcraft(Value)?\(/.test(appSources) ||
    /getContext\(["']2d["']\)|webgl|webgpu|OffscreenCanvas|ImageData/.test(appSources)
  );
}

export function sourceUsesHardcodedOutputBackgroundColor(
  source = stripJsComments(readFiles(srcDir, /\.(ts|tsx|css)$/)),
): boolean {
  const canvasFillPattern =
    /(?:ctx|context|canvasContext)\.fillStyle\s*=\s*["']#[0-9a-fA-F]{3,8}["'][\s\S]{0,240}\.fillRect\s*\(/;
  const outputCssBackgroundPattern =
    /\.(?:[a-z0-9_-]*(?:canvas|renderer|preview|output|product)[a-z0-9_-]*)\s*{[^}]*background(?:-color)?\s*:\s*#[0-9a-fA-F]{3,8}/i;

  return canvasFillPattern.test(source) || outputCssBackgroundPattern.test(source);
}

export function schemaHasOutputBackgroundColorControl(): boolean {
  return (appSchema.panels.controls?.sections ?? []).some((section) =>
    Object.values(section.controls).some((control) => {
      if (control.type !== "color") {
        return false;
      }

      const searchText = [
        section.title,
        typeof control.label === "string" ? control.label : "",
        control.target,
      ].join(" ");

      return /\b(background|backdrop|scene|canvas)\b/i.test(searchText);
    }),
  );
}

export function projectDocsIncludeFixedBackgroundDecision(): boolean {
  return /fixedBackgroundReason|fixed background|non-editable background|not user-editable background|reference-defined background|product-defined background/i.test(
    readProjectDecisionSources(),
  );
}

export function sourceUsesCpuPixelLoop(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));
  const cpuPixelMethodCallPattern =
    /(?:\.(?:createImageData|getImageData|putImageData)|\[\s*["'](?:createImageData|getImageData|putImageData)["']\s*\])\s*\(/;

  return (
    /new\s+ImageData\s*\(/.test(appSources) ||
    cpuPixelMethodCallPattern.test(appSources)
  );
}

export function appPerformanceHasRenderPipelinePass(kind: string): boolean {
  return (appPerformance.rendererPipeline?.passes ?? []).some(
    (pass) => pass.kind === kind,
  );
}

export function appPerformanceHasInteractionInvalidation(interaction: string): boolean {
  return (appPerformance.rendererPipeline?.interactionInvalidation ?? []).some(
    (entry) => entry.interaction === interaction,
  );
}

export function sourceUsesGpuRenderer(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));

  return /getContext\(["']webgl2?["']\)|navigator\.gpu|GPUCanvasContext/.test(appSources);
}

export function sourceUsesWebGlLifecycleGuard(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));

  return (
    /useEffect\s*\(/.test(appSources) ||
    /useLayoutEffect\s*\(/.test(appSources) ||
    /useMemo\s*\(/.test(appSources) ||
    /useRef\s*\(/.test(appSources) ||
    /class\s+\w+Renderer/.test(appSources)
  );
}

export function sourceCreatesWebGlContextInComponentRender(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));
  const componentRenderPattern =
    /function\s+[A-Z]\w*\s*\([^)]*\)\s*{(?![\s\S]{0,600}use(?:Layout)?Effect\s*\()[\s\S]{0,600}\.getContext\(["']webgl2?["']\)/;

  return componentRenderPattern.test(appSources);
}

export function sourceMayUploadTextureFromTimelineDrivenEffect(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));
  const timelineDrivenTextureUploadPattern =
    /use(?:Layout)?Effect\s*\(\s*\(\)\s*=>\s*{[\s\S]*?(?:texImage2D\s*\(|\.setImage\s*\()[\s\S]*?}\s*,\s*\[[\s\S]*?(?:settings|state\.timeline|currentTimeSeconds|keyframeGroups)[\s\S]*?\]\s*\)/;

  return timelineDrivenTextureUploadPattern.test(appSources);
}

export function sourceResyncsTimelineDurationFromRuntimeDuration(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));
  const durationResyncPattern =
    /use(?:Layout)?Effect\s*\(\s*\(\)\s*=>\s*{[\s\S]*?timeline\.setDuration[\s\S]*?}\s*,\s*\[[\s\S]*state\.timeline\.durationSeconds[\s\S]*\]\s*\)/;

  return durationResyncPattern.test(appSources);
}

export function sourceUsesLowResolutionPreviewUpscale(source = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/))): boolean {
  const lowResolutionPreviewPattern =
    /maxPreviewPixels|previewPixelBudget|previewScale|previewRatio|lowRes|lowResolution|downsample/i;
  const scaledDrawImagePattern =
    /\.drawImage\s*\([\s\S]{0,240}(?:outputWidth|outputHeight|state\.canvas\.size|canvas\.width|canvas\.height)[\s\S]{0,240}\)/;

  return lowResolutionPreviewPattern.test(source) || scaledDrawImagePattern.test(source);
}

export function sourceUsesAnimationFrameWithoutCleanup(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));

  return /requestAnimationFrame\s*\(/.test(appSources) && !/cancelAnimationFrame\s*\(/.test(appSources);
}

export function sourceUsesDirectStorageApi(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));

  return /\b(?:localStorage|sessionStorage)\s*\./.test(appSources);
}
