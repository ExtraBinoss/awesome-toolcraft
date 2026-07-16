# Acceptance Testing

> Reading route: start with `workflow.md`. Core generated-app rules live in `core/*`; this file is a focused acceptance reference for the topic below.

Every visible product entity must prove it works. A control is not accepted because it renders; it is accepted only when tests prove user interaction changes runtime state and the final product output, command side effect, timeline frame, layer result, media lifecycle, or canvas viewport.

## Required Files

- `src/app/app-acceptance-data.ts`
- app-specific tests under `src/app` outside the reserved `app-acceptance.*` framework namespace
- `src/app/app-performance.ts`
- `src/app/app-performance.test.ts`
- `docs/toolcraft/agent-worklog.md`
- `e2e/app-browser-acceptance.spec.ts`
- `e2e/app-controls.spec.ts`
- `e2e/app-performance.spec.ts`
- `e2e/product-observable-helpers.ts`

`npm run verify:final` must pass before final delivery. Incremental edits use the verification tier classifier from `assembly-workflow.md`: run targeted browser acceptance for the changed entity, and add a full browser performance checkpoint for the first working product version or an explicit performance complaint. Run `npm run verify:perf` before the final gate; its protected Playwright runner records the current-source machine receipt automatically. Agent-controlled browser checks remain useful for targeted diagnosis but cannot replace that receipt. `verify:final` rejects a missing or stale current-source receipt.

A full performance checkpoint is triggered only by the first working app version, or by a user request to optimize performance, fix lag, remove jank, speed up animation, stabilize drag/zoom, or otherwise investigate poor performance.

## Product Readiness

The exported starter may keep `appProductReadiness.mode: "starter"` only while it is still a neutral template. A real product must switch it to `mode: "product"` and fill:

- `productName`;
- `productSummary`;
- `requestedBehavior`.

Product readiness also requires product surface: controls, layers, timeline, `canvasContent`, or acceptance coverage. A renamed product folder must not pass tests as a neutral starter.

## Implementation Worklog

Product apps must update `docs/toolcraft/agent-worklog.md` before final delivery. The file records why the app chose its renderer, timeline mode, layer policy, control grouping, export behavior, and performance strategy.

The worklog must declare `Mode: product`. Every `Decision Trail` iteration must include `Request:`, `Task type:`, `User-visible result:`, `Source/reference checked:`, `Reference inputs:`, `Docs/contracts read:`, `Contract rules applied:`, `Decision:`, `Alternatives rejected:`, `State/output mapping:`, `Files changed:`, `Verification:`, `Skipped checks:`, and `Risks:`. `Reference inputs:` is the explicit inventory of prompt/reference assets for that pass: write `None` only when there were no external references, otherwise list the source apps, URLs, screenshots, videos, GIFs, screen recordings, contact sheets, extracted-frame folders, or media files used. `State/output mapping:` names how controls, commands, timeline, layers, media, or renderer state reaches the visible product or export. Each decision section (`Renderer`, `Timeline`, `Layers`, `Controls`, `Export`, `Performance`) must include `Decision:`, `Reason:`, and `Evidence:` entries. `Evidence` should name files, reference behavior, contract rules, browser checks, performance checks, or exact commands. `Performance` evidence must name the hard limit, smooth target, smooth target ratio, failed higher measurements, and attempted optimizations whenever a load profile lowers the smooth target below the hard limit. `Verification` must list concrete checks such as `npm run verify:quick`, targeted agent-browser diagnosis, browser tests, and the automated `npm run verify:perf` checkpoint. First working product delivery must record `npm run verify:final` and `npm run verify:perf` as passed. Failed, incomplete, pending, blocked, or skipped required checks make the app incomplete unless the full performance checkpoint is explicitly not required for a post-first-working non-performance edit. `Risks` must include either `Risk:` entries or `None:` with a reason.

The acceptance gate fails if the worklog is missing, still says `Mode: starter`, or lacks concrete decision evidence.

## Acceptance Rows

Every visible schema control, custom renderer feature, media lifecycle, timeline behavior, layer behavior, canvas sizing behavior, toolbar command, sticky action, and product editing handle needs an acceptance row.

Each row should name:

- stable `id`;
- `kind`;
- runtime `target` when the entity edits state;
- `componentType`;
- fixture data;
- real user action;
- expected product-level observable;
- evidence type;
- exact `automatedTestName`;
- exact `browserTestName`, the stable browser check name used by the agent-browser evidence and fallback Playwright test.
- `controlPartCoverage` when the control is compound.
- `canvasSizingCoverage: "fixed-output-size"` only for non-product/internal `fixed-output` fixtures.
- `canvasSizingCoverage: "intrinsic-media-size"` only for explicit media-viewer/source-native upload apps where imported media natural dimensions intentionally own `canvas.size`.
- `persistenceCoverage: "reload"` when schema `persistence.storage` is `"localStorage"`.
- `timelineLoopProof` on playback rows whose `timelinePlaybackCoverage` includes `"loop"`. It declares `direction: "forward-only"`, `reversePlayback: "forbidden"`, `seam: "first-last-match"`, and `durationChange: "reproved-after-edit"`; browser evidence still proves the real sampled frames.

The test gate rejects rows unless the real Vitest and Playwright runners select exactly one product-owned test with the declared name and that test finishes passed. A matching name in a comment, string, local fake runner, focused/skipped test, conditional branch, or uncalled registration function is not execution evidence.

The protected Vitest marker publishes the current automated requirements to the signed runner reporter, which evaluates actual selected test results instead of parsing test source. The signed full-test command fails when that marker is missing, duplicated, failed, invalid, or not framework-owned. User-visible browser behavior is proved at runtime: protected Playwright helpers attach versioned evidence after their assertion succeeds, and the signed reporter derives every required evidence id from `app-acceptance-data.ts`. A skipped/failed test, duplicate product test titles, a passed browser test without matching evidence, evidence from a failed retry, or a direct forged attachment fails its runner.

`src/app/app-acceptance.ts`, `src/app/acceptance`, supplied `app-acceptance.*` meta-tests, and the generic browser acceptance harness are framework-owned and covered by the signed integrity manifest. Edit only `app-acceptance-data.ts` for product rows/readiness/inventory/transfer intent. Add product-specific automated tests in separate app-owned files and add browser scenarios to `e2e/app-controls.spec.ts` or new app-owned specs.

The `e2e/app-browser-*` filename prefix is reserved for signed framework specs. Product browser tests use `app-controls.spec.ts` or a product-specific filename that does not start with `app-browser-`.

The local contract docs under `docs/toolcraft` are also signed framework-owned input to this workflow. Do not rewrite them inside a generated app. `docs/toolcraft/agent-worklog.md` remains product-owned so each implementation pass can record current decisions and evidence.

Framework meta-tests are product-invariant: their synthetic validator cases use protected neutral contract fixtures, never the editable app schema, product acceptance rows, transfer intent, or section inventory. Put exact product targets, defaults, option values, and product-specific expectations in separate app-owned tests. The product gates still read `app-schema.ts`, `app-acceptance-data.ts`, product test names, worklog evidence, and browser scenarios dynamically.

The same ownership split applies to performance: edit `app-performance.ts`, but do not edit supplied `app-performance.*` meta-tests or `app-performance-test-utils.ts`. They are framework-owned and validate the editable product matrix.

Slider and range slider rows must prove live behavior. Browser tests should drag the real thumb and assert the runtime value and product-level canvas observable update during the drag, not only after pointer release, blur, an Apply action, or a final commit. Performance-sensitive sliders still need this live acceptance; jank is handled through renderer optimization and targeted performance coverage, not by making the slider deferred by default.

`fixed-output` canvas sizing must be deliberate and is not valid for generated product/output apps with export actions. A default, reference, or fixed-format size from the prompt should use `editable-output`, which keeps the runtime Aspect ratio, Canvas width, and Canvas height controls.

`intrinsic-media` upload sizing must also be deliberate. Uploaded background/source images inside product canvases use `editable-output`, keep the current canvas size after upload, keep Setup canvas controls visible, and render cover/crop inside the current canvas bounds. Browser acceptance must upload an image with a different aspect ratio and prove the current canvas size remains unchanged while the image covers/crops the canvas.

When localStorage persistence is enabled, add a runtime acceptance row that proves reload behavior. The browser test must change a real user-facing setting, wait for persistence to write, call a real page reload, and verify the restored control value or product output. Importing a settings JSON file is not persistence coverage.

## Compound Controls

Compound controls have multiple semantic value parts inside one visible control. Their acceptance row must declare `controlPartCoverage`, and the browser test must explicitly exercise each required part against product output.

Required parts:

| Control | Required `controlPartCoverage` |
| --- | --- |
| `anchorGrid` | `anchorGrid.position` |
| `channelMixer` | `channelMixer.activeChannel`, `channelMixer.values`; only for RGB channel matrix behavior |
| `collectionActions` | `collectionActions.add`, `collectionActions.remove`, `collectionActions.items` |
| `colorOpacity` | `colorOpacity.hex`, `colorOpacity.opacity` |
| `curves` | RGB variant: `curves.activeChannel`, `curves.points`; `variant: "single"`: `curves.points` |
| `fontPicker` | `fontPicker.fontId`, `fontPicker.fontWeight`, `fontPicker.fontSize`, `fontPicker.letterSpacing`, `fontPicker.lineHeight`, `fontPicker.textCase`, `fontPicker.color`, `fontPicker.opacity` |
| `gradient` | `gradient.gradientType`, `gradient.angle`, `gradient.stops.position`, `gradient.stops.color`, `gradient.stops.opacity` |
| `palette` | `palette.family`, `palette.shade` |
| `rangeInput` | `rangeInput.start`, `rangeInput.end` |
| `rangeSlider` | `rangeSlider.lower`, `rangeSlider.upper` |
| `vector` | `vector.x`, `vector.y` |

Testing only one sub-control is not enough. For example, a `gradient` test that changes only a stop color must fail if the app also renders Gradient type, Angle, Position, or Opacity controls.

Palette acceptance must also prove live behavior: selecting a family or shade updates runtime state immediately, before delayed persistence or commit timers settle, and the next canvas/product interaction uses that selected token.

For `curves`, the acceptance row must match the intended variant. Semantic one-dimensional curves such as acceleration, bend, easing, response, depth, mask, opacity, threshold, or remap curves must set `variant: "single"` and prove `curves.points`; RGB active-channel coverage is reserved for color-correction or channel-specific curves.

For `fontPicker`, product output evidence must come from actual rendered/exported product text after changing the font, weight, size, letter spacing, line height, text case, color, and opacity. Runtime value changes, selected labels, or popup font previews are preflight checks, not final acceptance.

For `vector`, acceptance must prove both axes affect output and that the pad represents a user-authored stable two-axis parameter. Do not accept `vector` controls for current animation state, keyboard/pointer movement, physics state, timeline phase, velocity, target pose, current pose, or simulated position/direction; those belong to timeline/input/simulation state plus higher-level tuning controls such as Speed, Step, Spread, Path, Duration, or Timeline.

## Control Selection Gates

Acceptance must catch wrong-substitution failures. If the prompt, spec, or app behavior needs a value model owned by a built-in control, the schema must use that built-in or include a documented built-in fit check.

High-confidence wrong-substitution cases:

- gradient, stops, angle, fill transition, or adjustable gradient without `gradient`;
- typography without `fontPicker`;
- sibling typography controls that split case, color, opacity, size, weight, letter spacing, or line height away from `fontPicker`;
- color plus opacity without `colorOpacity`;
- repeatable user-editable item sets without `collectionActions` or another justified collection owner;
- from/to range without `rangeSlider` or `rangeInput`;
- curve, remap, easing, or response without `curves`;
- manual stable two-axis position, direction, focus, anchor, light, or vector parameters without `vector`;
- source upload without `fileDrop`;
- app-wide transport in the controls panel instead of timeline;
- segmented choices that clip instead of falling back to `select`;
- custom controls recreating built-ins.

`fileDrop` media-lifecycle rows must prove upload/import, clear/remove, image rotate/flip, thumbnail reorder for `multiple: true`, and global or section reset. A test that only clicks the clear button is not enough because Reset controls must also restore `media.defaultAssets` for predefined attached files or remove uploaded source material when no default exists. Product preview/export must consume runtime media order and `mediaAssets[].transform`.

Rows that use custom controls must include `customControlCoverage` and typed `builtInFitCheck`.

```ts
builtInFitCheck: {
  capabilities: [
    "collection",
    "reorder",
    "selection",
    "commands",
    "custom-value-model",
  ],
  checkedBuiltIns: ["fileDrop", "collectionActions", "imagePicker"],
  closestBuiltIn: "fileDrop",
  whyInsufficient:
    "FileDrop imports, previews, orders, and removes source files, but this product also needs per-glyph density thresholds stored with each item.",
  productObservable:
    "Changing a glyph density threshold changes which uploaded glyph renders for the same depth-map tone.",
}
```

The fit check declares broad typed capabilities, names real checked built-ins, the closest built-in or `"none"`, why it is insufficient, and the product-observable evidence that proves the custom control works. At least one of `custom-interaction`, `custom-value-model`, or `custom-visualization` is required; collection/command chrome alone does not justify custom UI.

For collection-like custom controls, the fit check must include `collectionActions` and `actions`. Collection-like is decided from the runtime value model and workflow: arrays, `{ items: [...] }` objects, selected-item state, grow/shrink item sets, ordering, add, remove, delete, or reorder behavior. Acceptance should fail if the row compares only unrelated built-ins such as `vector` or `select` while the actual value model is a collection.

Custom controls cannot be justified by icons, layout, styling, compactness, or custom buttons alone. `whyInsufficient` must name the product interaction or value model that built-ins cannot express.

## Valid Evidence

Valid acceptance evidence includes:

- rendered product pixels;
- exported image/video bytes;
- canvas hash or DOM-visible product result;
- clipboard, file, or blob payload;
- cleared media preview and canvas;
- selected layer output;
- changed canvas viewport;
- changed timeline playback state plus rendered frame.
- restored persisted value or product output after browser reload.

Product apps must include output delivery acceptance. Still-output apps need `Export PNG` evidence. Animated apps need both `Export Video` evidence and `Export PNG` evidence. Clipboard copy can be tested as an additional behavior, but it cannot replace export coverage.

Every app with `Export PNG` must exercise the separate `Image Export` section: choose at least two `export.image.format` values, choose at least two `export.image.resolution` values, export the image, and decode the result to prove file type and actual pixel dimensions changed. Animated apps with both `Export PNG` and `Export Video` still need this image-export coverage; `Video Export` does not replace it.

Async Export, Download, Copy, Generate, or Apply acceptance must prove the sticky footer top accent indicator is visible while the returned `onPanelAction` Promise is pending, advances when `reportProgress(0..1)` is called, and hides after it settles. Video export acceptance must prove frame-based progress updates during render/encode instead of only toggling a pending state.

Animated app acceptance must also exercise the separate `Video Export` section: choose at least two `export.video.format` values, choose at least two `export.video.resolution` values, verify unsupported MIME/container choices fall back safely, and assert exported video bytes, dimensions, MIME/container, and duration match runtime timeline state. `current` video export must use the current canvas/output size with even encoder-safe rounding. `4k` video export must use `getToolcraftVideoExportSize`, fit inside 3840x2160, preserve aspect ratio, and produce even dimensions; do not accept PNG-style 4096px long-edge video sizing. Recorder/encoder errors must reject instead of resolving corrupt blobs. The duration assertion must load the exported blob as a video, wait for metadata, and compare `video.duration` with the edited timeline duration; `blobSize > 0`, `blobType`, WebM parser fallback, or assigning the expected duration when metadata is missing are not enough.

Footer action acceptance must not include Reset. Reset is already available in the controls panel header and uses schema `defaultValue`; duplicating it in sticky `panelActions` fails acceptance.

Local `actions` acceptance must click every visible action and prove the nearby entity changed through runtime state or product output. A section-level `Randomize palette` must change palette output, `Normalize weights` must change weights/output, and `Clear selection` must clear only the scoped selection. Do not accept a test that only proves the button rendered. A single-button `actions` control fails validation when the control label duplicates the button label; the label must add concise context. Visual acceptance rejects side-label actions; labels sit above a two-column button grid where each button cell is 50% width.

`collectionActions` acceptance must click plus and minus in the real panel, prove the runtime target array length changes, prove `minItems` prevents invalid removal, prove `recommendedMaxItems` is not a hidden hard limit, and prove preview/export consumes the changed item list.

PNG export tests must prove runtime background behavior: changing the background color affects preview/export, turning `export.includeBackground` off hides the live preview product background and creates transparent PNG output, video export still keeps the background, turning Include on includes the current background color in PNG, and exported pixel dimensions are retina size, at least `state.canvas.size * 2`.

Hard acceptance semantics are typed, not inferred from English prose. Every `visibleWhen` acceptance row declares `visibilityCoverage` for both `hidden` and `visible`; the protected conditional-visibility recipe must remove the dependent target from the rendered panel and restore it through the same target-scoped gating control. The `export.includeBackground` row declares `backgroundOutputCoverage` for preview exclusion and transparent image alpha, plus preserved video background when the schema exposes video export. Its protected recipe verifies the preview transition, decodes a non-empty image artifact and checks background alpha, and inspects video background behavior when applicable. `expectedObservable` and `userAction` remain human-readable context and may use any language; matching words such as “hidden”, “PNG”, or “video” never satisfy these requirements by themselves.

Invalid final acceptance evidence:

- control exists;
- `data-*` attribute changed;
- runtime state was mutated directly;
- DOM text changed but product output did not;
- shader uniform changed without output proof;
- helper fixture proves a function but not the app behavior.

If a behavior cannot be proven through product output or a side effect, remove the entity or ask whether it is required.

## Browser Gate

Browser tests must open the running app and interact with the real UI by pointer, keyboard, file upload, canvas drag, toolbar click, timeline scrub, or layer drag.

Do not dispatch runtime commands directly for browser acceptance unless the entity is itself a command API. Browser tests must exercise what the user actually sees.

Every browser test should prove:

- the interaction is possible;
- runtime state changes through the expected target;
- product output or command side effect changes;
- canvas zoom, offset, and output dimensions do not jump unexpectedly.

Acceptance rows with `product-output`, `rendered-pixels`, or `timeline-output` evidence use protected `expectToolcraftProductObservableToChange` with the row `id` as `requirementId`. The generic `expectToolcraftAcceptanceOutcome` is intentionally limited to `command-side-effect`; it cannot emit media, persistence, viewport, layer, timeline, or compound-control evidence. Use `expectToolcraftMediaLifecycle`, `expectToolcraftPersistenceState`, and `expectToolcraftViewportSideEffect` for those state semantics. These recipes require an exact expected outcome after the real action and a bounded stability window; persistence additionally requires a real reload, media requires changed item ids plus product-output semantics, and viewport requires changed offset/zoom while output dimensions stay stable. Generic changed-output proof first samples a stable pre-action baseline. If the product output is autonomous or animated, pause/fix its phase or observe a stable expected semantic result; the next unrelated animation frame is not action evidence. A transient or merely different value is not proof. `getToolcraftProductObservableSnapshot` may establish a baseline, but a snapshot read alone is not mutation evidence. Product tests must not import the internal attachment recorder or reserved evidence contract directly or through product-owned bridges.

Specialized state, layer, compound, and timeline recipes begin with `createToolcraftBrowserProofSession(page)`. Create observations with `session.observe(...)`, where the reader executes inside the current visible Toolcraft runtime root, and actions with `session.action(...)`; persistence uses `session.reload()` for the reload step. Raw callbacks, forged objects, stale pages, and observations/actions from different sessions are rejected before evidence is attached. This binds semantic evidence to the current app identity and browser DOM instead of allowing an in-memory object to impersonate product behavior.

Exported-byte rows use `expectToolcraftExportedArtifact`. The action produces a non-empty artifact and the verifier returns a typed inspection with positive integer `byteLength`; decoded `width`, `height`, and `frameCount` are positive integers, `durationMs` is positive and finite, and `mediaType`/`contentHash` are non-empty strings when present. Missing/empty artifacts, void callbacks, `{ ok: true }`, fractional or zero-byte observations, and fractional decoded dimensions cannot emit evidence. Clean-export checks for canvas handles compare decoded product semantics through `contentHash` plus media metadata, not raw encoded bytes or file size, because two valid encoders may produce different bytes for the same output.

Specialized metadata adds evidence for the same row: canvas handles prove drag and a separate clean-export test compares real exported artifacts with handles visible and hidden; segmented/discrete controls use their protected layout helpers; every declared compound-control part uses `expectToolcraftCompoundControlPartOutcome` and gets its own `row-id#part` evidence; layers use the fixed `expectToolcraftLayer*` recipes for selection, visibility, reorder, grouping, selected-layer controls, and media lifecycle; and reference parity uses `expectToolcraftReferenceParity` to compare the inspected result with the reference baseline. Playback uses the fixed `expectToolcraftTimeline*` recipes. Duration binds runtime duration and renderer cycle to the same expected value; scrub binds time to rendered output; pause/resume proves a stable paused window and resumed time/output; keyframes bind keyframe data, evaluated value, and output. Loop evidence requires normalized forward samples with exactly one end-to-start wrap, equal seam signatures, and the same proof again after changing duration. The reporter derives these requirements from acceptance plus schema; naming a helper in source or passing a desired evidence type to a generic helper is never proof.

Animated viewport tests must also prove that canvas drag, pan, pinch, zoom, and radar/center interactions suspend or coalesce non-essential animation preview work without changing the user's play/pause state. After the interaction, the renderer must resume from the correct timeline or autonomous time and keep canvas zoom/offset stable.

## Video References

When a video, GIF, screen recording, contact sheet, or extracted-frame sequence is used as a reference, acceptance is driven by `appTransferMode.videoReferenceStudy`.

- `storyboard` records timecoded frames with visible state and behavior observations;
- `transitionAnalysis` records frame-to-frame deltas, not only isolated frame descriptions;
- `behaviorDecomposition` states which observed behaviors must be copied;
- `acceptanceMapping` maps each observed video behavior to a real acceptance row;
- mapped acceptance rows must be automated, browser-backed, and observable in product output, timeline output, export output, or a real command side effect;
- `agent-worklog.md` records Video Reference Study evidence when `Reference inputs`, `Source/reference checked`, or `Source reviewed` cites video, GIF, screen recording, contact sheet, or extracted frames.

Do not accept a video reference implementation proved only by a single screenshot, a visual summary, generic canvas hashes, or static style checks.

## Reference Clone

Reference clone coverage is driven by `appTransferMode.referenceFeatureInventory`.

- `appTransferMode.referenceStudy` records source inspection plus original/reference behavior checked by running the original or restoring it locally when possible;
- list every user-visible and output-affecting reference feature before implementation;
- include source evidence, feature-level behavior evidence from the reference study, reference behavior, Toolcraft mapping, status, and one `acceptanceId` for each item;
- map every `referenceCoverage` and `referenceTimelineCoverage` acceptance row from the inventory;
- cover canvas sizing, control mapping, renderer loop/state, pause/resume, restart, export/copy, media lifecycle, persistence/randomization/reset, and custom reference timeline behavior when those exist in the reference;
- mark behavior as `intentionally-changed` only with explicit user approval or redesign/change-request evidence.

Do not treat a few generic checks as a complete reference transfer. The acceptance set must prove that the reference functionality inventory was implemented, not merely that the app renders.

## Timeline And Layers

When animation controls exist without `panels.timeline`, acceptance validation requires `appTransferMode.animationIntent.mode = "autonomous"`. That intent must explain why the animation is decorative/self-running and must cover no user-facing transport, no play/pause, no scrub, no duration control, no loop control, and no export-at-time.

Playback timeline coverage must prove play/pause, scrub, duration, loop, restart when exposed, non-looping Play at the end restarts from 0, and export/copy at selected time when relevant. Timeline animation intent must match the enabled timeline mode and declare `loopDuration` with source, seconds, and evidence; `panels.timeline.defaultDurationSeconds` must match that value. Reference clones using `referenceTimeline.mode: "toolcraft-playback"` or `"toolcraft-keyframes"` must declare the same proof on `referenceTimeline.loopDuration`. Duration coverage must edit the real `Edit timeline duration` control, prove the playback range changes, and prove the renderer maps one full product animation cycle to `state.timeline.durationSeconds`. Loop coverage must prove a seamless forward-only product loop: motion advances in one direction, mirror/yoyo/ping-pong/reverse fallbacks are absent unless explicitly requested, first and last frames stitch without a visible jump, and the same seam holds after changing timeline duration. Tests should compare visible or exported output at 0, midpoint, end minus epsilon, and the wrapped first frame after changing the timeline duration. Prefer `getToolcraftTimelineLoopTime` or `getToolcraftTimelineLoopProgress` in the renderer so this phase math is shared. Do not accept a renderer that uses a separate fixed local duration while the timeline displays another duration, and do not accept a renderer effect that watches `state.timeline.durationSeconds` only to dispatch `timeline.setDuration` back to a computed local value.

Keyframe timeline coverage must prove diamond creation, expanded rows, keyframe updates on control change, scrub/playback evaluation, and product output changes for every inferred keyframe-capable control. Tests must prove renderers consume typed evaluated values from the Toolcraft keyframe evaluator; checking `valueLabel`, row count, or source strings is not enough.

Layer browser coverage must use the real LayersPanel UI: click rows, toggle visibility, drag rows to reorder, and drag rows into groups.

## Component Variants

Component variants are acceptance requirements.

- Discrete sliders must render `[data-slot="slider"][data-variant="discrete"]`, show the expected full-width markers, and remain smooth while dragging.
- Schema sliders must stay full-width and stacked; only `fontPicker` may pair its internal letter-spacing and line-height footer sliders.
- Continuous stepped sliders must not render discrete markers.
- Range sliders must stay full-width, start with different lower and upper defaults, and accept built-in manual range separators such as slash, hyphen, spaces, and dashes.
- Segmented controls must preserve cell padding and avoid label collision.
- Select, segmented, and image-picker controls should cover every visible option unless options come from separately tested runtime data.
- Custom controls must declare `customControlCoverage` and `builtInFitCheck`. Coverage proves the custom control is not a built-in replacement, uses kit chrome, keeps only necessary UI, writes through runtime state, and changes product output; the fit check proves which built-ins were considered and why the custom interaction is necessary.

Performance browser tests pass `scenarioId` to protected measurement/interaction helpers and await `expectToolcraftScenarioPerformanceBudget(..., appPerformance, scenarioId)`. Every mutating measurement supplies `observeOutcome`; generic change evidence first proves a stable baseline and then requires the product outcome to remain different through the stability window. Autonomous products use `expectedOutcome` with a stable semantic observation or measure at a deterministic fixed phase. Latency ends at that expected result, never at an incidental animation frame. Scalar fixtures provide both `applyValue` and `observeValue`; object fixtures provide both functions for every exact fixture key, and the observed value must equal the declared fixture before measurement. Measurement results are immutable and branded to one scenario, so another scenario or a mutable literal cannot satisfy the gate. The reporter requires matching measurement, budget, fixture, interaction/completion, and product-outcome evidence for each typed scenario. Do not hardcode budget numbers, toy values, or toy baseline app states; `app-performance.ts` is the single source of truth.

## Fixtures

Use fixtures that make each behavior visible. For example, background character-size controls need visible background characters, transparency needs alpha-sensitive pixels, selected-layer controls need multiple layers, timeline controls need deterministic playback or keyframe fixtures, and mode-specific controls need fixtures for every mode branch. Conditional coverage must prove visible controls, inactive controls hidden with `visibleWhen`, preserved values after switching away and back, and renderer output for the active branch. Count-controlled control banks must test both the low-count UI state and the expanded-count UI state; the test fails if inactive controls remain visible while the renderer ignores them.

Generic hash differences are not enough for semantic controls. If a control promises a direction, test that direction.
