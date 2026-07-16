# Toolcraft Workflow

This file is the app-local routing layer for Toolcraft work. It does not replace the detailed contracts; it tells an agent which contract to read and which verification path to use before editing.

## Required Preflight

Before planning or editing app code, runtime code, controls, canvas, panels, renderer, timeline, layers, export, or tests:

1. Confirm the nearest `AGENTS.md` is the active project contract.
2. Classify the project type:
   - **Generated app**: use local `docs/toolcraft/*`.
   - **Starter source**: use `starter/AGENTS.md`, local starter docs, and runtime contracts.
   - **Runtime/template source**: use root `AGENTS.md` and runtime contracts.
3. Classify the task type.
4. Read the task-specific docs below.
5. Choose and record a verification tier before implementation.

Do not edit implementation files until this preflight is complete.

## Local Contract Authority

The signed local `AGENTS.md` plus `docs/toolcraft/*` are sufficient and mandatory workflow input for a standalone generated app. External workflow skills should be used when available, but missing skills never invalidate `--no-skills` generation and never justify skipping the equivalent local spec, plan, debugging, browser, or verification requirement. `npm run ai:check` enforces local code health and reports missing external skills as actionable guidance rather than a build failure.

Core modules are required reading when listed by the routing table. Read each listed module fully, one phase at a time. Open exactly one listed document per terminal or tool read, even when several documents belong to the same route and phase. Do not concatenate documents or rely on a truncated excerpt; finish the current phase, then open the next phase when the work reaches it. The signed host and runtime validators enforce platform boundaries, while product organization remains open inside those boundaries.

## Task Routing

Use the smallest route set that covers the changed surface. When a task matches multiple routes, process them sequentially inside the phase currently in progress and skip documents already read in that phase; open each document separately and never concatenate route documents into one terminal output. Read Plan documents before the spec or implementation plan, Implementation documents immediately before code, and Verification documents immediately before writing or running proof. A broken behavior still starts with the failing test, log, or reproduction before its Plan documents; a Figma task still starts with Figma MCP/design context.

[//]: # (toolcraft-workflow-routes:start)
| Task route | Plan phase | Implementation phase | Verification phase |
| --- | --- | --- | --- |
| App assembly, route structure, generated app porting | `core/runtime-boundary.md`<br>`assembly-workflow.md` | `decision-contract.md` | `acceptance-testing.md` |
| Reference app study, audit, or port | `core/reference-study.md`<br>`core/runtime-boundary.md`<br>`assembly-workflow.md` | `schema-reference.md`<br>`decision-contract.md` | `acceptance-testing.md` |
| Schema, controls, defaults, persistence, actions | `core/control-selection.md`<br>`core/layout.md` | `schema-reference.md`<br>`component-rules.md` | `acceptance-testing.md` |
| Custom controls | `core/control-selection.md`<br>`core/layout.md` | `custom-controls.md`<br>`component-rules.md` | `acceptance-testing.md` |
| Renderer, canvas output, visual technique | `core/runtime-boundary.md`<br>`core/performance.md` | `renderer-technique.md`<br>`performance.md` | `acceptance-testing.md` |
| Timeline, keyframes, animation transport | `core/timeline-animation.md`<br>`core/performance.md` | `decision-contract.md`<br>`component-rules.md` | `acceptance-testing.md` |
| Layers | `core/runtime-boundary.md`<br>`core/layout.md` | `decision-contract.md`<br>`component-rules.md` | `acceptance-testing.md` |
| Export, copy, media, background | `core/setup-export.md`<br>`core/media-upload.md` | `schema-reference.md`<br>`component-rules.md` | `acceptance-testing.md`<br>`performance.md` |
| Broken control, visual mismatch, failed build, export bug, performance issue | `decision-contract.md`<br>`core/runtime-boundary.md` | `component-rules.md`<br>`renderer-technique.md` | `acceptance-testing.md`<br>`performance.md` |
| Figma implementation | `core/reference-study.md`<br>`core/runtime-boundary.md`<br>`assembly-workflow.md` | `schema-reference.md`<br>`component-rules.md` | `acceptance-testing.md` |
[//]: # (toolcraft-workflow-routes:end)

## Worklog Gate

For product app work, update `docs/toolcraft/agent-worklog.md` before reporting completion. Record:

- `Decision Trail` entries for each significant implementation pass, including:
  - request;
  - task type;
  - user-visible result;
  - source/reference checked;
  - docs/contracts read;
  - contract rules applied;
  - decision;
  - alternatives rejected;
  - state/output mapping from controls, commands, timeline, layers, media, or renderer to the visible product;
  - files changed;
  - verification;
  - skipped checks with reason;
  - risks or follow-ups.
- updated high-level decisions for renderer, timeline, layers, controls, export, and performance when those choices change.

If the folder is still the neutral starter, do not invent product decisions. Once it becomes a product, switch the worklog to product mode and keep it concrete.

## Runtime Boundary

Use the runtime extension points described in the current contracts:

- schema controls;
- `canvasContent` for product output only;
- `controlRenderers` only for true custom controls;
- `onPanelAction` for sticky product actions;
- runtime commands and hooks.

Do not recreate controls, panels, toolbar, timeline, layers, canvas shell, or runtime surfaces by hand. If a shared behavior is wrong, fix the shared runtime/template source and regenerate when needed.

Browser verification is outcome-based. Protected helpers attach versioned evidence only after a persistent observable change, an observed fixture application, a decoded non-empty export inspection, a completed output action, an immutable scenario measurement, and its matching budget check. The signed reporter derives required evidence from acceptance and performance config and fails skipped, missing, duplicate, transient, unmeasured, or unbudgeted scenarios.

## Verification Gate

Choose the tier from `AGENTS.md` before editing. Use the tier to decide checks.

- Tier 0-1: targeted docs/typecheck/unit plus focused browser when visual.
- Tier 2: `npm run verify:quick` plus relevant browser acceptance.
- Tier 3: `npm run verify:quick`, targeted browser acceptance, and targeted performance scenarios only for touched workload/viewport/export paths.
- Tier 4: run `node scripts/check-toolcraft-integrity.mjs` directly. For the first working product version, run the browser performance checkpoint and record its current-source receipt first, then run `npm run verify:final`, then start `npm run dev` for the local URL.

Run a full performance checkpoint only when:

- the first working version of the app exists;
- the user explicitly asks to optimize performance, fix lag, remove jank, speed up animation, stabilize drag/zoom, or otherwise complains about performance.

Fast feature loops after the first working version do not run the full performance suite by default. Renderer, canvas, animation, export, timeline, layers, `canvas.renderScale`, bug fixes, and performance-sensitive controls still need targeted functional/browser checks first, plus targeted performance scenarios only when they directly exercise the touched path. Record any skipped full performance run and reason in the worklog.

The app is not complete when required checks are failed, incomplete, pending, blocked, or listed as skipped. Run the integrity checker directly before the final gate so verification does not depend only on mutable package-script dispatch. First working product delivery runs `npm run verify:perf` before `npm run verify:final`; the protected Playwright checkpoint records the machine receipt, while agent-controlled browser work remains targeted diagnostic evidence. `verify:final` rejects missing or stale receipts. After the first working version, use the typed `npm run verify:perf:record-exemption -- --tier=<0|1|2>` path only for a post-first-working non-performance edit backed by a prior passed receipt.
