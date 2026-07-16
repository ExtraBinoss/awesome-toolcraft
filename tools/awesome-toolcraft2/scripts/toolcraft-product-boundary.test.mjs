import assert from "node:assert/strict";
import test from "node:test";

import { evaluateToolcraftProductBoundary } from "./toolcraft-product-boundary.mjs";
import { createToolcraftProductBoundaryFixture as createFixture } from "./toolcraft-product-boundary-test-fixtures.mjs";

test("accepts an open product composition and safe primitives", async (context) => {
  const rootDir = await createFixture(context, {
    "src/app/app-composition.tsx": `
      import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";
      import { Button } from "@/toolcraft/ui/primitives";
      import { appSchema } from "../domain/schema";
      export const appComposition: ToolcraftAppComposition = {
        canvasContent: <Button>Render</Button>,
        schema: appSchema,
      };
    `,
    "src/domain/schema.ts": `
      import { defineToolcraft } from "@/toolcraft/runtime/react";
      export const appSchema = defineToolcraft({ id: "fixture", controls: [] });
    `,
    "src/main.tsx": `import { appComposition } from "./app/app-composition"; void appComposition;`,
  });

  const result = await evaluateToolcraftProductBoundary({
    protectedFilePaths: ["src/main.tsx"],
    rootDir,
  });

  assert.deepEqual(result.violations, []);
  assert.equal(result.productSourceCount, 2);
});

test("finds host surfaces outside src/app through aliases and sibling shells", async (context) => {
  const rootDir = await createFixture(context, {
    "src/features/product-shell.tsx": `
      import { CanvasShell as ProductCanvasHost, ToolcraftApp } from "@/toolcraft/runtime/react/canvas/canvas-shell";
      export function ProductShell() {
        return <ToolcraftApp canvasContent={<ProductCanvasHost />} schema={schema} />;
      }
    `,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.deepEqual(
    result.violations.map((violation) => violation.kind),
    ["runtime-surface", "runtime-surface"],
  );
  assert.match(result.violations[0].message, /CanvasShell/u);
  assert.match(result.violations[1].message, /ToolcraftApp/u);
});

test("checks Vite root-absolute imports against the same product boundary", async (context) => {
  const rootDir = await createFixture(context, {
    "outside-product.ts": "export const outsideProduct = true;\n",
    "src/features/absolute-runtime.tsx": `
      import { CanvasShell } from "/src/toolcraft/runtime/react";
      export const canvas = <CanvasShell />;
    `,
    "src/features/fixture.test.ts": "export const fixture = true;\n",
    "src/features/production.ts": `
      import { fixture } from "/src/features/fixture.test";
      import { outsideProduct } from "/outside-product";
      void fixture;
      void outsideProduct;
    `,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.deepEqual(
    result.violations.map((violation) => violation.kind),
    ["runtime-surface", "production-test-import", "source-boundary-escape"],
  );
});

test("finds built-in controls through re-exports, aliases, namespaces, and dynamic imports", async (context) => {
  const rootDir = await createFixture(context, {
    "src/features/control-bridge.ts": `
      export { SliderControl as ProductSlider } from "@/toolcraft/ui/components/controls";
      export { Color as ProductColor } from "@/toolcraft/ui";
    `,
    "src/features/dynamic.ts": `
      export async function loadControls() {
        return import("@/toolcraft/ui/components/controls/slider");
      }
    `,
    "src/features/namespace.ts": `
      import * as Controls from "@/toolcraft/ui";
      export const Slider = Controls.Slider;
    `,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.equal(result.violations.length, 4);
  assert.equal(
    result.violations.every((violation) => violation.kind === "built-in-control"),
    true,
  );
});

test("ignores tests but checks a product bridge imported by production", async (context) => {
  const rootDir = await createFixture(context, {
    "src/features/bridge.ts": `
      export { TimelinePanel as ProductTimeline } from "@/toolcraft/runtime/react";
    `,
    "src/features/bridge.test.tsx": `
      import { TimelinePanel } from "@/toolcraft/runtime/react";
      void TimelinePanel;
    `,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].repoPath, "src/features/bridge.ts");
});

test("rejects production imports of tests through relative and source aliases", async (context) => {
  const rootDir = await createFixture(context, {
    "src/features/renderer.test.ts": "export const fixture = 1;\n",
    "src/product/aliased.ts": `import { fixture } from "@/features/renderer.test"; void fixture;`,
    "src/product/relative.ts": `export { fixture } from "../features/renderer.test";`,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.deepEqual(
    result.violations.map((violation) => violation.kind),
    ["production-test-import", "production-test-import"],
  );
});

test("rejects product CSS that can restyle the signed host", async (context) => {
  const rootDir = await createFixture(context, {
    "src/features/package-style.ts": `import "some-library/global.css";`,
    "src/features/package-style-module.ts": `import "some-library/theme.module.css";`,
    "src/features/package-style-dynamic.ts": `
      const themePath = "some-library/" + "theme.module.css";
      export const loadTheme = () => import(themePath);
    `,
    "src/features/plain-style-dynamic.ts": `
      export const loadStyles = () => import("./unsafe.css");
    `,
    "src/features/bare-selector.module.css": `
      button, [data-slot="panel-title"] { display: none; }
    `,
    "src/features/external-import.module.css": `
      @import "some-library/theme.css";
      .preview { color: white; }
    `,
    "src/features/product.module.css": `.preview { color: white; }`,
    "src/features/safe-descendant.module.css": `.preview > button { color: white; }`,
    "src/features/safe-sibling.module.css": `.preview + .caption { color: white; }`,
    "src/features/sibling-escape.module.css": `
      .preview + [data-slot="panel-title"] { display: none; }
    `,
    "src/features/runtime-override.module.css": `:global([data-slot="toolcraft-runtime-app"]) { display: none; }`,
    "src/features/safe-root-style.ts": `import "/src/features/product.module.css";`,
    "src/features/unsafe-global.css": `.toolcraft-runtime-app { display: none; }`,
    "src/features/unsupported-style.ts": `import "./theme.module.scss";`,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.deepEqual(
    result.violations.map((violation) => violation.kind),
    [
      "product-global-css",
      "product-global-css",
      "product-global-css-import",
      "product-global-css-import",
      "product-global-css-import",
      "product-global-css-import",
      "product-global-css",
      "product-global-css",
      "product-global-css",
      "product-global-css-import",
    ],
  );
  assert.equal(
    result.violations.some((violation) =>
      violation.repoPath.endsWith("product.module.css"),
    ),
    false,
  );
  assert.equal(
    result.violations.some((violation) =>
      violation.repoPath.endsWith("safe-descendant.module.css"),
    ),
    false,
  );
  assert.equal(
    result.violations.some((violation) =>
      violation.repoPath.endsWith("safe-sibling.module.css"),
    ),
    false,
  );
});

test("allows functional selectors only when every anchoring branch stays local", async (context) => {
  const rootDir = await createFixture(context, {
    "src/features/safe-is.module.css": `
      :is(.preview, .card:hover) > button { color: white; }
    `,
    "src/features/safe-where.module.css": `
      :where(.preview, :is(.card, .tile)) .label { color: white; }
      .preview :is(button, .icon) { color: white; }
      :where(.preview + .caption) { color: white; }
    `,
    "src/features/unsafe-has.module.css": `
      :has(.preview) button { display: none; }
    `,
    "src/features/unsafe-is.module.css": `
      :is(.preview, button) .label { display: none; }
    `,
    "src/features/unsafe-not.module.css": `
      :not(.preview) button { display: none; }
    `,
    "src/features/unsafe-sibling.module.css": `
      :where(.preview + button) { display: none; }
    `,
    "src/features/unsafe-where.module.css": `
      :where(.preview, [data-slot="panel-title"]) { display: none; }
    `,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.deepEqual(
    result.violations.map((violation) => violation.repoPath),
    [
      "src/features/unsafe-has.module.css",
      "src/features/unsafe-is.module.css",
      "src/features/unsafe-not.module.css",
      "src/features/unsafe-sibling.module.css",
      "src/features/unsafe-where.module.css",
    ],
  );
});

test("rejects product source imported from outside the scanned source roots", async (context) => {
  const rootDir = await createFixture(context, {
    "outside-product.tsx": `
      import { ToolcraftApp } from "@/toolcraft/runtime/react";
      export const outsideProduct = ToolcraftApp;
    `,
    "src/app/app-composition.tsx": `
      import { outsideProduct } from "../../outside-product";
      export const appComposition = { canvasContent: outsideProduct };
    `,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.deepEqual(
    result.violations.map((violation) => violation.kind),
    ["source-boundary-escape"],
  );
});

test("rejects global style injection from product JSX", async (context) => {
  const rootDir = await createFixture(context, {
    "src/app/jsx-style.tsx": `
      export const appComposition = {
        canvasContent: <style>{"[data-toolcraft-canvas-world] { display: none; }"}</style>,
      };
    `,
    "src/app/style-element.ts": `
      export const styleElement = document.createElement("style");
    `,
    "src/app/stylesheet.ts": `
      export const stylesheet = new CSSStyleSheet();
    `,
  });

  const result = await evaluateToolcraftProductBoundary({ rootDir });

  assert.deepEqual(
    result.violations.map((violation) => violation.kind),
    [
      "global-style-injection",
      "global-style-injection",
      "global-style-injection",
    ],
  );
});
