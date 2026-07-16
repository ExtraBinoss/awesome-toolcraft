# Performance

Read this module before changing renderer technique, animation, canvas, media, export, render scale, heavy controls, or performance tests.

## Verification Triggers

Run a full performance checkpoint only when:

- the first working product app version exists;
- the user explicitly asks to optimize performance, fix lag, remove jank, speed up animation, stabilize drag/zoom, or otherwise complains about performance.

After the first working version, feature loops do not run the full performance suite by default. Renderer, canvas, animation, export, timeline, layers, `canvas.renderScale`, bug fixes, and performance-sensitive controls still need targeted functional/browser checks first, plus targeted performance scenarios only when they directly exercise the touched workload, viewport, or export path.

## Verification Tiers

- Tier 0-1: targeted docs/typecheck/unit plus focused browser when visual.
- Tier 2: `npm run verify:quick` plus relevant browser acceptance.
- Tier 3: `npm run verify:quick`, targeted browser acceptance, and targeted performance scenarios for touched workload/viewport/export paths.
- Tier 4: for the first working product version, run and receipt the browser performance checkpoint first, then run `npm run verify:final` against the current receipt.

Record skipped full performance runs and reason in the verification note or worklog.

## Workload Fixtures

- Performance scenarios declare `stressFixture` for the tested control value.
- `export-copy` scenarios declare the exact `panelActions` `actionValue`, visible `controlLabel`, and `completionEvidence` (`download` or `clipboard`). Their browser test uses the matching protected output-action helper with `scenarioId`; the helper owns the click and real download/clipboard completion. The signed reporter rejects missing completion evidence, skipped/failed tests, and evidence from failed retries.
- Browser perf tests apply scalar values with `applyToolcraftPerformanceStressValue` / `applyToolcraftPerformanceWorkloadValue` and object fixtures with `applyToolcraftPerformanceStressFixture` / `applyToolcraftPerformanceWorkloadFixture`. Every fixture mapping supplies `applyValue` plus `observeValue`; evidence attaches only after the observed UI/runtime value exactly matches the declared fixture.
- Mutating measurements pass a structured-cloneable `observeOutcome`. Generic change evidence first proves that its baseline stays stable before the action, timestamps the first live changed response, then requires the final post-action outcome to remain changed through the stability window. Autonomous or animated output uses `expectedOutcome` with a stable semantic observation, or the test fixes playback to a deterministic phase; an incidental next frame cannot satisfy the interaction. The immutable result stays bound to the same `scenarioId` as its budget. `durationMs` uses a runner monotonic clock from interaction start to the first changed or expected response; required frame sampling survives document navigation, and settle/stability checks still finish before evidence is emitted without replacing product-response latency with action completion or inflating it with the post-change window. Non-mutating measurements end at action completion.
- When the tested control is not itself the whole heavy source, declare `workloadFixture` and apply it first.
- Numeric control ranges and hard limits come from schema; scenarios may omit duplicated `values`, and any supplied values must match schema exactly. A bounded numeric control cannot switch to `metric: "custom"` to avoid its min/max.
- Numeric maximums, density, item counts, canvas/media size, and combined heavy states declare `loadProfile` with `hardLimit`, `smoothTarget`, and `smoothTargetRatio`. `many-items` applies at least 10 real items; lowering an authored `minCount` is not evidence.
- Try the hard limit first.
- Lower the guaranteed smooth target only in 10 percent steps with failed-measurement and optimization evidence. Every entry names the exact `attemptedRatio`, schema-reachable `attemptedTarget`, scenario id, and target for that step.
- Ranges above `smoothTarget` are experimental, not silently guaranteed.

## Media And Pixel Workloads

- Media import and image-processing workloads use realistic `kind: "media"` fixtures at least `1920x1080`-equivalent.
- Heavy upload/preview tests must cover realistic source dimensions such as 2K/4K when the app accepts images.
- Heavy pixel/media Canvas 2D must evaluate WebGL or WebGPU with measured evidence before staying on CPU.
- Do not stay on CPU for millions of per-pixel operations on the main thread unless measurement proves it remains responsive and alternatives were evaluated.

## Render Scale

- Non-vector raster, Canvas 2D, WebGL, and WebGPU previews set `canvas.renderScale: true`.
- Runtime `Resolution scale` defaults to `2` and changes backing pixels without changing CSS/output size.
- Performance fixes must preserve selected render scale and visible output quality.
- Do not downsample, blur, stretch low-resolution backing pixels, or clamp render scale below the user's chosen value to pass budgets.

## Slider Responsiveness

- Slider and range slider controls are live canvas controls.
- Dragging a thumb updates runtime state and product output while the drag is in progress.
- If live updates are slow, fix renderer path first:
  - update uniforms or stable buffers;
  - cache decoded media and expensive derived inputs;
  - coalesce preview work to `requestAnimationFrame`;
  - cancel stale async renders;
  - move heavy work off React renders;
  - change renderer strategy when measured evidence supports it.
- Only at an extreme measured ceiling may the app use degraded live preview or delayed heavy refinement; even then, immediate canvas feedback is required.

## Renderer Pipeline Inventory

Custom renderer apps declare a typed `rendererPipeline`:

- render passes;
- cache keys;
- execution location;
- preview/export quality;
- interaction invalidation;
- control-to-pass mapping.

Every performance-sensitive control maps to the pass it invalidates.

## Optimization Evidence

Optimization worklogs record:

- bottleneck diagnosis;
- renderer technique evaluated;
- fixtures used;
- measurements before and after;
- rejected alternatives;
- remaining risks;
- why quality was preserved.
