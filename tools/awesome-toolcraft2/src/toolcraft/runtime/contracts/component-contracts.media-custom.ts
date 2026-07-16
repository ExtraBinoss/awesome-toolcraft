import { control, decisionCatalog } from "./component-contract-builders";
import type { ToolcraftComponentContract } from "./types";
export const TOOLCRAFT_MEDIA_CUSTOM_COMPONENT_CONTRACTS = {
  fileDrop: {
    ...control("fileDrop", "FileDrop", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "source material upload",
        "file import",
        "media import",
        "drop target",
      ],
      useWhen: [
        "Use FileDrop for source material uploads, file import, or drag-and-drop media input.",
      ],
      doNotReplaceWith: [
        "Do not place upload UI on the canvas.",
        "Do not draw a custom canvas empty-state design, CTA, fake sample output, decorative placeholder, or agent-invented preset source while waiting for uploaded content.",
        "Do not build custom file buttons for source media import.",
      ],
      acceptableAlternatives: [
        "Use ImagePicker when users choose from built-in visual options rather than uploading a file.",
      ],
      layoutConstraints: [
        "FileDrop lives in the controls panel; single-layer apps use its preview and clear behavior.",
        "When fileDrop has assetKind: image and one image is present, the runtime renders image transform actions through the built-in actions-control directly below the uploader: 90° Right, Flip horizontal, and Flip vertical.",
        "FileDrop image previews keep a stable preview frame when rotated or flipped. Rotated preview bitmaps use contain semantics inside that frame so the controls-panel preview never crops the image; canvas/product renderers may still use cover/crop when the uploaded image is source material.",
        "When fileDrop has multiple: true and more than one image is present, the runtime renders a sortable four-column thumbnail grid with the add-more tile last.",
        "When fileDrop has multiple: true and more than one image is present, image transform actions render only after the user selects a thumbnail, and they target only that selected image.",
        "When fileDrop has assetKind: file, the runtime renders a sortable file list with a paperclip icon, filename, remove button, and row separators using --border/5.",
      ],
      requiredAcceptance: [
        "Prove file import changes media state and product output; prove clear, reorder, rotate, flip, and section/global reset update source material.",
      ],
    }),
    aiUsageRules: [
      "Use fileDrop for source material uploads in the controls panel, not on the canvas.",
      'Use fileDrop with assetKind: "image" for image-only source media and assetKind: "file" for arbitrary uploaded files.',
      "If an app ships with predefined source files or background images, declare them as schema media.defaultAssets with sourceTarget matching the fileDrop control. They must render as ordinary attached files in fileDrop, not as hidden renderer constants or canvas placeholder artwork.",
      "Predefined media files are default runtime state: users can remove them to get an empty source/canvas state, persistence may keep that removal with include: [\"media\"], and global or section Reset restores the default attached files.",
      "When uploaded/imported content is part of the source-material flow, the canvas must not show agent-invented artwork, CTA text, fake sample output, decorative placeholders, or preset source designs before real content exists; keep the canvas neutral/runtime-backed and put upload affordance in fileDrop.",
      "Do not add procedural Source Preset modes only to avoid an empty canvas. A default procedural or reference source is allowed only when the prompt/reference explicitly defines it and the worklog records that evidence.",
      "In single-layer apps, the runtime shows the uploaded image as the fileDrop preview and provides the clear action.",
      "In image mode, the runtime owns image transform actions: 90° Right, Flip horizontal, and Flip vertical. These actions render through the built-in actions-control in one three-column row with compact visible labels: 90°, Flip H, Flip V; keep a 6px vertical gap between the uploader and action row. Do not create a custom image action button grid. They update runtime mediaAssets transform metadata, and product preview/export must consume that metadata instead of keeping a separate transform state.",
      "FileDrop panel previews are not product canvas rendering. Keep the preview frame height stable across image rotation/flip, and contain the rotated bitmap inside that frame so horizontal or vertical uploads are not cropped by the control.",
      "When exactly one uploaded image is present, image transform actions are visible immediately. When multiple images are present, users select a thumbnail first; no transform actions render until a thumbnail is selected, and the action applies only to that selected image.",
      "In file mode, the runtime shows uploaded files as a sortable list with paperclip icons, file names, remove buttons, and --border/5 separators.",
      "In single-layer apps, global Reset controls and section reset must restore fileDrop source media to schema media.defaultAssets for that target; when no default asset exists, Reset removes uploaded media and returns the fileDrop target to defaultValue.",
      "Use fileDrop with multiple: true when the app needs several uploaded images as one source set; do not build a custom thumbnail uploader for this.",
      "When multiple uploaded images are present, the runtime appends media, shows a sortable four-column preview grid, puts the add-more tile last, and exposes per-image removal.",
      "Canvas drops route to the first visible matching fileDrop target by asset kind: image files prefer image uploaders, non-image files prefer file uploaders, and file uploaders accept images only when no image uploader matches.",
      "Dragging thumbnails reorders runtime mediaAssets; preview, export, and renderer mapping must consume that media order instead of maintaining a separate product-only order.",
      "When uploaded images are used as canvas/background source material, draw them with cover/crop behavior: scale proportionally until the current canvas bounds are fully covered, keep the canvas size/settings unchanged, and crop overflow at the canvas bounds.",
      "Do not create custom upload buttons, file lists, or file sorting for generic source uploads when fileDrop can represent the source set.",
      "In multi-layer apps, deletion and visibility belong to the Layers panel; fileDrop remains an upload target.",
    ],
    commands: ["media.delete", "media.import", "media.reorder", "media.transform"],
  },
  imagePicker: {
    ...control("imagePicker", "ImagePicker", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "visual option choice",
        "thumbnail selection",
        "preset image choice",
      ],
      useWhen: [
        "Use ImagePicker when users choose one visual option from a set of thumbnails or images.",
      ],
      doNotReplaceWith: [
        "Do not recreate ImagePicker grids manually.",
        "Do not show choices that the renderer treats as fallback or no-op.",
      ],
      acceptableAlternatives: [
        "Use Select for non-visual named options.",
        "Use FileDrop for user-uploaded source material.",
      ],
      layoutConstraints: [
        "Runtime owns tile sizing by option count.",
      ],
      requiredAcceptance: [
        "Prove each visible image choice changes product output or selected visual data.",
      ],
    }),
    aiUsageRules: [
      "ImagePicker owns thumbnail layout; pass the item list only and do not recreate the grid manually.",
      "Every visible ImagePicker item must be actionable in the current product context.",
      "Do not show selectable image choices that the renderer later sanitizes to a fallback or no-op.",
      "If available choices depend on another control such as template, mode, or selected object, either make every visible item valid for every mode, split the choice into separate semantic controls, or ask the user before implementation.",
      "A defensive invalid-value fallback is allowed, but it is not acceptance proof for a visible ImagePicker option.",
      "Tests must choose each visible ImagePicker item and assert the selected image, texture, gradient, or exported pixels change in the product output.",
      "Do not accept renderer data attributes, runtime target changes, or option existence as final proof that an image choice works.",
    ],
  },
  customControl: {
    decisionCatalog: decisionCatalog({
      strictness: "custom-escape-hatch",
      ownsValueModel: [
        "product-specific interaction not expressible by built-in controls",
      ],
      useWhen: [
        "Use custom controls only after checking all relevant built-ins and documenting why the closest built-in is insufficient.",
      ],
      doNotReplaceWith: [
        "Do not use custom controls to recreate built-in controls, runtime panels, toolbar, timeline, layers, canvas, or sticky panel actions.",
      ],
      acceptableAlternatives: [
        "Prefer built-in schema controls plus renderer logic whenever the value model fits an existing control.",
      ],
      layoutConstraints: [
        "Custom UI must use Toolcraft primitives and minimal product-specific chrome.",
      ],
      requiredAcceptance: [
        "Document rejected built-ins, prove runtime-state writes, and prove product output or command side effects.",
      ],
    }),
    aiUsageRules: [
      "Use custom controls only for product interactions that built-in controls cannot express.",
      "Do not use a custom control to recreate a built-in Slider, RangeSlider, Select, Segmented, Switch, Checkbox, Color, ColorOpacity, Gradient, FontPicker, ImagePicker, FileDrop, TextInput, CodeTextarea, RangeInput, Palette, Actions, CollectionActions, Curves, AnchorGrid, ChannelMixer, Vector, or PanelActions control.",
      "Every custom-control builtInFitCheck declares typed capabilities. Use collection, reorder, selection, commands, custom-interaction, custom-value-model, and custom-visualization to describe behavior without relying on product nouns.",
      "When a custom control owns a growable, removable, selectable, or reorderable runtime item set, its builtInFitCheck must explicitly check collectionActions and actions before choosing custom; this is based on the value model and user workflow, not on entity names such as masks or glyphs.",
      "Do not justify custom controls with icons, layout, styling, compactness, or custom buttons alone. The fit check must name the product interaction or value model that built-ins cannot express.",
      "Custom controls may use Toolcraft primitives for small app-specific chrome, but must not import or render low-level runtime surfaces or duplicate toolbar, timeline, layers, canvas, panel, or built-in control mechanics.",
      "Custom controls must render the minimum UI needed to understand the value, context, and available actions; avoid decorative metadata and text that repeats what the section, label, or visible item already explains.",
      "Every visible custom-control element must justify its space by enabling selection, ordering, preview, removal, upload, editing, or status that affects the product.",
      "Use Toolcraft primitives and tokens for all custom-control chrome; do not hand-style basic buttons, inputs, selects, sliders, scroll areas, or focus states.",
      "Custom-control action buttons must be sized for the interaction. Do not shrink destructive, reorder, upload, or primary actions below comfortable kit button/icon-button sizes just to fit more text.",
      "Choose preview sizes that match the product object scale. A glyph, swatch, chip, or thumbnail can be compact, but its actions and hit targets must stay readable and clickable.",
      "If a custom item needs explanatory context, prefer concise labels such as Darkest, Mid tone, or Lightest; omit file names, long captions, and duplicated helper text unless they are required to distinguish items.",
      "Acceptance and browser tests must prove custom-control interactions work through runtime state and product output, not only that custom markup rendered.",
    ],
    capabilities: ["controlRenderers", "runtime-state", "minimal-ui"],
    commands: [],
    historyPolicy: "patch",
    id: "customControl",
    kind: "control",
    labelPolicy: "required",
    schemaType: "controlRenderers",
    stateMode: "controlled",
    visualComponent: "CustomControlRenderer",
  },
} as const satisfies Record<string, ToolcraftComponentContract>;
