# Runtime Boundary

Read this module before changing app assembly, routes, runtime surfaces, custom renderers, canvas output, panels, toolbar, timeline, layers, or controls.

## Required Runtime Shell

- Build through `defineToolcraft`.
- Render through `ToolcraftApp`.
- Read `appSchema.assembly` before adding custom JSX. It lists the enabled runtime surfaces, capabilities, commands, and assumptions for the current app.
- Keep app state in the Toolcraft runtime schema and runtime commands.
- Keep product assembly in typed `src/app/app-composition.tsx`; the signed route only hosts `ToolcraftApp`.
- Do not replace Toolcraft with copied reference UI, route-local panels, standalone forms, or hand-built editor chrome.

## Allowed Extension Points

Use only these app-specific extension points. Shared runtime changes happen upstream and reach generated apps through regeneration:

- schema controls;
- schema `canvas`, `panels`, `toolbar`, `panelActions`, `persistence`, `media`, `assembly`, and transfer-mode metadata;
- `canvasContent` for product output only;
- `renderDefaultCanvasMedia={false}` only when a product renderer replaces the default media preview;
- `controlRenderers` only for true custom controls that pass the built-in fit check;
- `onPanelAction` for sticky product actions;
- runtime commands and hooks.

## Forbidden Rebuilds

- Do not hand-compose `ToolcraftRoot`, `CanvasShell`, `ControlsPanel`, `LayersPanel`, `TimelinePanel`, `ToolbarPanel`, or panel containers in product routes.
- Do not render built-in control components such as `SliderControl`, `SelectControl`, `ColorControl`, `GradientControl`, `FontPickerControl`, `FileDropControl`, or `PanelActionsControl` directly in app code.
- Do not recreate controls, panels, toolbar, timeline, layers, canvas shell, drag handles, section headers, section reset, history, or runtime surfaces by hand.
- If a shared behavior is wrong, fix the shared runtime/template source and regenerate or sync the copied Toolcraft source instead of patching one exported app.

## Canvas Boundary

- `canvasContent` contains product output only: WebGL, Canvas 2D, SVG, DOM product text, shaders, generated previews, export previews, or product editing handles.
- App UI, CTAs, upload prompts, helper copy, placeholder instructions, buttons, menus, forms, and settings do not belong in `canvasContent`.
- If upload/import is part of the source-material flow, the pre-content canvas stays neutral and runtime-backed. Upload affordance belongs in `fileDrop`.
- DOM product text rendered inside `canvasContent` must be marked with `data-toolcraft-product-output` or `data-toolcraft-product-text` so tests and performance fixtures can target product output instead of app chrome.
- Product editing handles must be textless overlays, write to runtime state, and stay out of export/copy output.
- Preserve the runtime canvas backing. Product renderers may draw their own product background, but must not hide, replace, or make the Toolcraft canvas shell/backing transparent.

## State Boundary

- Bind every visible control to runtime schema state or a runtime command side effect.
- Use `defaultValue` for resettable controls.
- Use runtime commands such as `controls.reset`, `controls.resetTargets`, `media.import`, `media.delete`, `canvas.center`, `history.undo`, and `history.redo`.
- Do not keep final product settings in isolated local React state when they need reset, persistence, import/export, keyframes, browser acceptance, or product export.

## Generated App Source Boundary

- Generated applications keep their public entry surface in `src/app/app-composition.tsx` and `src/app/app-schema.ts`. Supporting product modules may live anywhere under `src`; every product production module is discovered by the same source inventory and checked by the same AST boundary.
- The signed framework bootstrap includes `index.html`, `src/main.tsx`, `src/router.tsx`, `src/routes/index.tsx`, `src/routes/root.tsx`, and `src/styles.css`. Do not edit or replace those host files in a generated app.
- Product styling is local by construction: use locally imported `*.module.css` files only. Every selector starts with a compound containing a local class. A first-compound `:is()` or `:where()` remains local only when every branch is locally anchored; `:not()` and `:has()` do not create a local anchor. Descendants may style product-owned children, but `:global`, bare/root selectors, host-attribute selectors, sibling escapes, CSS `@import`, package CSS imports, and product-created global `<style>`/`CSSStyleSheet` injection are rejected because they cross the product/runtime boundary.
- Product `import()` and `require()` specifiers must be statically resolvable from literals, same-file constants, templates, or string concatenation. Production and test source share this rule, so computed module loading cannot hide a runtime/control import or a protected evidence channel.
- Product production modules must not import product tests, test-support modules, or protected browser-evidence internals, directly or through a product bridge. Runtime evidence is emitted only by the protected public acceptance/performance helpers after their assertions pass; product-owned source must not import, re-export, assemble, or forge the reserved evidence module names and payload identifiers.
- Product production modules must form an acyclic dependency graph. The code-health gate resolves relative imports, directory `index.*` modules, configured TypeScript path aliases, and local package exports. Type-only imports, external packages, tests, and copied Toolcraft framework internals do not create product dependency edges. When a cycle exists, the gate prints the complete shortest cycle so the ownership boundary can be corrected directly.
- Imported product source remains under `src`. Code health and product-boundary analysis consume the same canonical source-inventory semantics instead of maintaining independent recursive walkers. The signed Vitest reporter uses the canonical framework-ownership policy to distinguish product-owned runner results, while acceptance and performance requirements derive from typed app configuration.
- Do not edit `src/toolcraft` in a generated app. It is an immutable signed copy of the shared runtime. Fix the monorepo runtime and regenerate the app.
- Generated integrity protects the copied runtime, signed host/bootstrap, framework validators/tests, `AGENTS.md`, local contract docs under `docs/toolcraft`, `LICENSE.md`, `NOTICE.md`, TypeScript/Vite/Vitest/Playwright root configuration, and the commands of the original package scripts. Alternate root config files in those verification families are rejected instead of silently creating a second test path. `docs/toolcraft/agent-worklog.md` is the explicit editable documentation exception; every other file added under `docs/toolcraft` is rejected as unrecorded contract input. Product dependencies, unrelated product scripts, product source, and the worklog remain editable, but all product production modules are AST-checked for host-surface and built-in-control bypasses. Added `pre*` or `post*` lifecycle hooks for a protected script are rejected because they can execute across a verification boundary. Run the checker directly before the final gate; `npm run test` must fail when any protected file changes, or when the copied runtime tree or its signed integrity manifest is missing, changed, or contains unrecorded source.
- Generated apps must not contain monorepo app/package folders, workspace-protocol dependencies, or workspace package imports.
