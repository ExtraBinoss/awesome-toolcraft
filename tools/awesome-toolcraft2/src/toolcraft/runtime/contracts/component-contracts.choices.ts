import { control, decisionCatalog } from "./component-contract-builders";
import type { ToolcraftComponentContract } from "./types";
export const TOOLCRAFT_CHOICE_COMPONENT_CONTRACTS = {
  select: {
    ...control("select", "Select", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "finite single selection",
        "long option labels",
        "many options",
        "segmented fallback",
      ],
      useWhen: [
        "Use Select for finite choices with long labels, many options, or values that would not fit in Segmented.",
        "Use Select when a dropdown choice is more readable than a row of segmented cells.",
      ],
      doNotReplaceWith: [
        "Do not use Select to recreate FontPicker, Gradient, ImagePicker, FileDrop, Curves, Vector, or Palette value models.",
      ],
      acceptableAlternatives: [
        "Use Segmented for two to four short closely related options that fit without clipping.",
      ],
      layoutConstraints: [
        "Standalone Select controls render stacked full-width with the label above the dropdown; do not use the compact side-label row with label left and dropdown right.",
        "Prefer compact two-column inline layout only for related short Select pairs that tune one workflow or entity.",
        "Use vertical one-select-per-row layout for single Select controls and as the fallback when a Select pair label, selected value, or option text would clip, truncate, or lose internal padding in the compact row.",
        "If a compact Select pair falls back to vertical layout, record the fit reason in the spec or worklog.",
      ],
      requiredAcceptance: [
        "Prove every visible option or representative option set changes product output or interpreted product state.",
      ],
    }),
  },
  segmented: {
    ...control("segmented", "Segmented", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "compact finite mode choice",
        "two to four short related options",
        "single-row mode toggle",
      ],
      useWhen: [
        "Use Segmented for compact mode choices where every cell keeps internal padding.",
        "Use Segmented when the options are short, closely related, and easier to compare side by side.",
      ],
      doNotReplaceWith: [
        "Do not use Segmented for long labels, many options, or values that clip.",
        "Do not use Segmented for actions; use buttons or panelActions.",
      ],
      acceptableAlternatives: [
        "Use Select when options are long, numerous, or break segmented cell padding.",
      ],
      layoutConstraints: [
        "Keep text segmented controls to at most four options and compact labels.",
        "Segmented controls are full-width controls and must not be placed in two-column inline or half-width layout groups.",
        "Fallback to Select when cells collide, clip, or lose padding.",
      ],
      requiredAcceptance: [
        "Prove every visible segment changes the relevant product mode or output.",
        "Browser verification must treat clipped or paddingless cells as broken.",
      ],
    }),
    aiUsageRules: [
      "Use Segmented only for compact mode choices where every cell keeps its internal padding.",
      "Do not place Segmented beside Switch, Color, Select, or another control in an inline row; use Select when a finite choice must occupy a half-width column.",
      "If a segmented control is too wide, first shorten option labels; if the compact labels still exceed the width budget, use Select because it has the same selection mechanics without broken cells.",
      "Generated schemas should keep text segmented controls to at most four options, no option label longer than nine characters, and no more than twenty-four total option-label characters.",
      "Browser verification must treat collided, clipped, or paddingless segmented cells as a broken component and switch to shorter labels or Select.",
    ],
  },
  switch: {
    ...control("switch", "Switch", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "immediate binary setting",
        "on/off product behavior",
        "enabled/disabled runtime option",
      ],
      useWhen: [
        "Use Switch for a binary setting that applies immediately.",
        "Use Switch for options such as Glow, Loop, CRT, Background, or Guides.",
      ],
      doNotReplaceWith: [
        "Do not use Switch for more than two options.",
        "Do not use Switch for destructive actions or commands that need confirmation.",
      ],
      acceptableAlternatives: [
        "Use Checkbox when the option is an explicit inclusion flag.",
        "Use Select or Segmented for more than two options.",
      ],
      layoutConstraints: [
        "Two adjacent Switch controls for the same product entity must share one inline row when both labels fit; the runtime auto-pairs safe adjacent switches by target entity when no explicit layout group is needed.",
      ],
      requiredAcceptance: [
        "Prove toggling the switch changes the product output or runtime behavior.",
      ],
    }),
    aiUsageRules: [
      'Switch labels name the setting context only; do not prefix labels with "Enable" or "Disable" because the switch already communicates on/off behavior.',
      'Use labels such as "CRT", "Background", "Glow", or "Loop" instead of "Enable CRT" or "Disable background".',
      "Two adjacent Switch controls for the same product entity must share one inline row when every visible label fits without truncation. Keep paired labels to short one- or two-word names; the runtime auto-pairs safe adjacent switches by target entity, and generated schemas should stack switches only when any label would truncate.",
      "When the nearest section title already names the switch context, do not duplicate that title as the visible switch label. Use label false for a visual-only toggle and keep the meaning in target/description.",
      'A Switch may share an inline row with one related parameter control when the visible switch label is short enough to fit. That row uses equal-width columns and the same horizontal column gap as paired Select controls; never shrink the switch column to intrinsic width. The non-switch parameter uses label false in that row; if its label is needed, stack the controls instead. In section-owned rows, use a short visible switch label such as "Include" instead of repeating the section title, such as "Include background" inside Background.',
    ],
  },
  checkbox: {
    ...control("checkbox", "Checkbox", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "explicit optional flag",
        "included/excluded choice",
        "binary checklist state",
      ],
      useWhen: [
        "Use Checkbox when the product meaning is an explicit optional flag or inclusion choice.",
      ],
      doNotReplaceWith: [
        "Do not use Checkbox for immediate setting toggles that read more naturally as Switch.",
        "Do not use Checkbox for commands.",
      ],
      acceptableAlternatives: [
        "Use Switch for immediate on/off settings.",
        "Use Select or Segmented for more than two options.",
      ],
      layoutConstraints: [
        "Two adjacent Checkbox controls for the same product entity must share one inline row when both labels fit; the runtime auto-pairs safe adjacent checkboxes by target entity when no explicit layout group is needed.",
      ],
      requiredAcceptance: [
        "Prove checking and unchecking changes product output or runtime behavior.",
      ],
    }),
    aiUsageRules: [
      'Checkbox labels name the setting context only; do not prefix labels with "Enable" or "Disable" because the checkbox already communicates enabled/selected state.',
      'Use labels such as "Transparent background", "Guides", or "Loop" instead of "Enable transparent background".',
      "When the nearest section title already names the checkbox context, do not duplicate that title as the visible checkbox label. Use label false for a visual-only checkbox and keep the meaning in target/description.",
      "Two adjacent Checkbox controls for the same product entity must share one inline row when every visible label fits without truncation. Keep paired labels to short one- or two-word names; the runtime auto-pairs safe adjacent checkboxes by target entity, and generated schemas should stack checkboxes only when any label would truncate.",
      "A Checkbox may share an inline row with one related parameter control when the visible checkbox label is short enough to fit. That row uses equal-width columns and the same horizontal column gap as paired Select controls; never shrink the checkbox column to intrinsic width. The non-checkbox parameter uses label false in that row; if its label is needed, stack the controls instead. Hide the checkbox label when the section title provides the visible context.",
    ],
  },
  actions: {
    ...control("actions", "Actions", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "local section action",
        "small contextual command",
        "non-sticky workflow command",
        "entity-scoped command group",
      ],
      useWhen: [
        "Use Actions for local commands inside a control section that affect the nearby entity.",
        "Use Actions for section-scoped commands such as Randomize palette, Normalize weights, Sort glyphs, Clear selection, Duplicate item, or Reset current entity.",
      ],
      doNotReplaceWith: [
        "Do not use Actions for final product export, copy, generate, apply, or download actions.",
        "Do not use Actions for global reset; the panel header owns reset.",
        "Do not use Actions for timeline transport such as Play, Pause, Resume, Restart, or Scrub.",
      ],
      acceptableAlternatives: [
        "Use panelActions for sticky product delivery actions.",
        "Use item-level icon buttons inside custom controls for local item remove/reorder commands.",
        "Use the top TimelinePanel for animation transport commands.",
      ],
      layoutConstraints: [
        "Keep local actions close to the entity they affect.",
        "Keep action labels short and scoped by the section title; prefer Randomize, Clear, Sort, Normalize, Duplicate, or Reset when the section already names the target.",
        "Do not set an Actions control label to the exact same visible text as its only button; use a short one- or two-word context label such as Ink wash, Palette action, or Current layer while the button keeps the command verb.",
        "Actions never use a side-label layout. If a visible label exists, it sits above the buttons.",
        "Actions buttons render as a two-column grid. One visible button occupies the left half of the section; two buttons occupy one half each; more than two buttons wrap into additional 50% cells.",
        "Do not center or right-align a partial final Actions row; an odd trailing button stays in the left 50% cell.",
      ],
      requiredAcceptance: [
        "Prove each action dispatches the intended command or product side effect for the nearby entity only.",
      ],
    }),
    commands: ["controls.reset", "controls.apply"],
    stateMode: "command-only",
    aiUsageRules: [
      "Use Actions for local commands inside the current section when the command affects only the nearby entity or workflow step.",
      "Good Actions examples: Randomize palette, Normalize weights, Sort glyphs, Clear selection, Duplicate item, Reset current layer, Reset current stop, or Shuffle shades.",
      "Do not use Actions for final product delivery actions; use sticky panelActions for Export, Copy, Download, Generate, or Apply.",
      "Do not use Actions for global reset; the controls panel header owns global reset.",
      "Do not use Actions for animation transport; Play, Pause, Resume, Restart, and Scrub belong to the top timeline when timeline behavior exists.",
      "For a single visible Actions button, the control label and button label must not be identical; make the control label a concise context and the button label the command.",
      "Render the Actions label above the buttons; do not put the label on the left with buttons on the right.",
      "Render Actions buttons in 50% cells: one button uses the left half, two buttons fill one row, and larger groups continue in two columns.",
      "Do not stretch an odd trailing Actions button full-width.",
      'For local reset-like actions, use product-specific values such as "reset-current-layer" or "reset-palette" and handle them through ToolcraftApp onPanelAction; do not use a bare "reset" value unless the action intentionally runs controls.reset.',
      "Acceptance and browser tests must click each Actions button and prove the product output or runtime state for the nearby entity changed.",
    ],
  },
  collectionActions: {
    ...control("collectionActions", "CollectionActions", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "repeatable product entity collection",
        "add/remove product items",
        "dynamic list of visible controls",
        "canvas-backed collection size",
      ],
      useWhen: [
        "Use CollectionActions when users can add or remove repeated product entities such as colors, glyphs, symbols, points, rules, variants, or object entries.",
        "Use CollectionActions instead of a count Slider when the user edits the actual set of items rather than only a numeric amount.",
      ],
      doNotReplaceWith: [
        "Do not use Slider to add or remove real collection items.",
        "Do not use plain Actions for add/remove collection ownership; Actions are local commands, not collection state owners.",
        "Do not use CollectionActions for panel-only lists that do not affect canvas preview or export.",
      ],
      acceptableAlternatives: [
        "Use fileDrop multiple when the repeated entities are uploaded images.",
        "Use Gradient when the repeated entities are gradient stops inside an adjustable gradient.",
        "Use customControl only when the repeated entity needs interactions no built-in collection item control can express.",
      ],
      layoutConstraints: [
        "CollectionActions sits at the start of its section, renders the collection label on the left, and keeps remove/add icon buttons together on the right.",
        "Homogeneous repeated item controls do not render visible per-item labels when the collection label already names the group.",
        "Collection item controls follow normal density rules: plain color items use equal 50% columns when they fit, while color+opacity items stay stacked.",
        "CollectionActions is a compound control and follows content-width compound divider rules when sharing a section with sibling controls.",
        "recommendedMaxItems is an agent/layout/performance hint, not a hard add limit; hardMaxItems is allowed only for real algorithm, format, API, export, or proven performance limits.",
      ],
      requiredAcceptance: [
        "Prove plus adds a runtime item and that the new item appears in or affects canvas preview and export.",
        "Prove minus removes a runtime item and that the removed item disappears from or stops affecting canvas preview and export.",
        "Prove minItems prevents deleting below the minimum and recommendedMaxItems does not silently block adding more items.",
      ],
    }),
    stateMode: "controlled",
    aiUsageRules: [
      "Use CollectionActions for repeatable product entities whose actual item list can grow or shrink.",
      "Adding or removing collection items must update the runtime target array consumed by the renderer and export; do not add panel-only items.",
      "Do not model add/remove item behavior with a Slider count when users need to edit the actual items.",
      "recommendedMaxItems is advisory only and must not disable the plus button. Use hardMaxItems only when a real product, algorithm, API, export, or measured performance limit requires it.",
      "CollectionActions item controls use built-in controls whenever possible, such as Color, ColorOpacity, TextInput, Select, Segmented, Slider, Switch, Checkbox, RangeInput, or FontPicker.",
      "Use FontPicker as the collection item control when each repeated item is a typography/text-style entity; do not split its font, color, opacity, size, case, letter-spacing, or line-height into sibling collection fields.",
      "Do not add visible labels like Color 1, Color 2, Item 1, or Item 2 for homogeneous collection items when the collection label already explains the group.",
      "Use compact half-width item layout whenever the child control is allowed to fit in a half row; color items without opacity are the default two-column case.",
      "Acceptance must add and remove items through the browser UI and prove canvas/export output follows the changed collection.",
    ],
  },
  panelActions: {
    ...control("panelActions", "PanelActions", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "sticky final product action",
        "export action",
        "copy action",
        "generate action",
        "apply action",
      ],
      useWhen: [
        "Use panelActions for final product actions such as Export, Copy, Generate, Apply, or Download.",
      ],
      doNotReplaceWith: [
        "Do not place final product action buttons on the canvas.",
        "Do not use regular section Actions for final sticky export or generate actions.",
        "Do not duplicate global Reset in panelActions.",
      ],
      acceptableAlternatives: [
        "Use Actions only for local section commands.",
      ],
      layoutConstraints: [
        "Footer actions are one compact sticky group with secondary on the left and primary on the right.",
      ],
      requiredAcceptance: [
        "Prove panel actions execute real product side effects such as exported bytes, clipboard payload, or generated output.",
        "For async panelActions, prove the sticky footer top accent indicator is visible while the returned Promise is pending, advances when reportProgress is called, and hides after it settles.",
      ],
    }),
    aiUsageRules: [
      "Use panelActions only for sticky footer product actions such as Generate, Export, Copy, or Download.",
      "Do not use panelActions for resetting controls; the controls panel header owns Reset controls.",
      "Handle product-specific panelActions through ToolcraftApp onPanelAction.",
      "Async product actions such as Export, Download, Copy, Generate, or Apply must return the real Promise from onPanelAction and report progress through the onPanelAction reportProgress callback.",
      "The sticky footer top accent indicator is determinate when reportProgress receives 0..1 values and falls back to pending state only when progress is unavailable.",
      "defineToolcraft hoists panelActions into the controls panel sticky footer automatically.",
      "Product-output apps must always include export in panelActions.",
      'Export-labeled panelActions use icon "upload-simple", matching the Setup "Export Settings" action; do not use "download", "download-simple", or "export" icons for Export PNG or Export Video.',
      "Static or still-output apps include Export PNG as the primary footer action.",
      'Every app with Export PNG must expose a separate "Image Export" controls section.',
      'The Image Export section must include "export.image.format" as a Select control with PNG and JPG choices, defaulting to "png".',
      'The Image Export section must include "export.image.resolution" as a Select control with 2K, 4K, and 8K choices, defaulting to "4k".',
      "Image Export format and resolution render as one compact two-column inline Select pair, matching the Video Export settings structure.",
      "Image Export resolution controls the actual exported image long edge: 2K = 2048px, 4K = 4096px, 8K = 8192px. Pass the selected runtime value to createToolcraftPngExportCanvas resolution and prove decoded image width/height in browser acceptance.",
      "Animated apps include Export Video as the primary footer action and Export PNG as a secondary footer action.",
      "Any app with Export Video must enable the top Toolcraft timeline; video duration, loop, and rendered timestamps come from runtime timeline state.",
      'Animated apps with Export Video must expose a separate "Video Export" controls section.',
      'Animated apps with both Export PNG and Export Video must expose both "Image Export" and "Video Export"; Image Export sits immediately before Video Export.',
      'The Video Export section must include format and resolution controls such as targets "export.video.format" and "export.video.resolution".',
      "Use Select controls for Video Export format and resolution; do not use Segmented unless the product has a deliberately tiny fixed output menu and browser tests prove every cell keeps padding.",
      'Place the Video Export section as the final controls section directly above sticky footer panelActions.',
      'Video Export format defaults to "mp4"; keep "webm" available as the baseline alternate unless the prompt/reference requires another default.',
      'Video Export resolution defaults to "current"; keep "4k" available as the high-resolution alternate.',
      "Video Export format and resolution are a compact semantic pair and should use a two-column inline layout by default; use stacked rows only when labels or selected values do not fit without clipping.",
      'Baseline browser video formats are "mp4" and "webm"; MOV or ProRes require an explicit custom encoder/transcoder and dedicated acceptance plus performance coverage.',
      "Video export code must choose the actual MIME/container through MediaRecorder.isTypeSupported or an equivalent encoder capability check, then fall back safely.",
      "Video export must use getToolcraftVideoExportSize for current and 4K dimensions. Current video export uses the current canvas/output size with even encoder-safe rounding; 4K video fits inside an encoder-safe 3840x2160 box, preserves canvas aspect ratio, and uses even pixel dimensions. Do not hand-roll 4096px long-edge video sizing.",
      "Video export must set recording canvas dimensions before captureStream, MediaRecorder, VideoEncoder, or equivalent encoder setup, and must reject recorder/encoder errors instead of returning corrupt blobs.",
      "Offline video export duration must be encoded from runtime timeline timestamps. Do not rely on canvas.captureStream plus MediaRecorder wall-clock recording time as the only duration mechanism for rendered-frame export.",
      'Video resolution must control exported dimensions. Use "current" output size by default; "4K" is an export resolution target, not a hardcoded 3840x2160 canvas lock.',
      "Video export browser coverage must load the exported blob metadata and prove video.duration matches the edited runtime timeline duration; blobSize/blobType checks alone are not enough.",
      "Video export must report frame-based progress through reportProgress during render/encode steps. PNG export should report phase progress for render, blob, and handoff when those phases are asynchronous.",
      'Product-output apps must expose a dedicated "Background" section directly before the first export settings section. With PNG export that first section is Image Export; with video-only export it is Video Export.',
      "Product-output apps must pass the includeBackground runtime value to createToolcraftPngExportCanvas for PNG alpha and call shouldIncludeToolcraftPreviewBackground(state) for live preview product background.",
      "PNG export must use createToolcraftPngExportCanvas so background transparency and selected image dimensions or retina fallback are applied consistently; turning Include off makes preview product background and PNG alpha transparent without hiding the Toolcraft canvas backing or video background.",
      "Video export must keep product background and use getToolcraftVideoExportSize for current/4K output dimensions.",
      "Copy PNG can be a secondary action when clipboard output is useful, but copy does not replace export.",
      "Add Copy PNG as a secondary action only when the prompt/reference includes clipboard output or the product clearly benefits from paste/share workflows.",
      "Footer actions must be one compact horizontal group; do not split them into stacked full-width sections.",
      "If two footer actions are needed, render secondary/outline on the left and primary on the right.",
      "When an odd number of footer actions renders in two columns, the final unpaired action spans the full row width.",
    ],
    commands: ["controls.apply"],
    stateMode: "command-only",
  },
} as const satisfies Record<string, ToolcraftComponentContract>;
