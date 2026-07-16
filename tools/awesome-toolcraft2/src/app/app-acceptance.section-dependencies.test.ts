import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import {
  contractTransferModeFixture,
  validateContractAcceptance,
} from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("starter acceptance section dependency contract", () => {
  it("rejects stale control section inventory entries", () => {
    const schemaWithInventoryMismatch = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                kind: {
                  defaultValue: "soft",
                  label: "Kind",
                  options: [
                    { label: "Soft", value: "soft" },
                    { label: "Sharp", value: "sharp" },
                  ],
                  orderRole: "mode",
                  target: "shape.kind",
                  type: "select",
                },
                count: {
                  defaultValue: 12,
                  label: "Count",
                  max: 40,
                  min: 1,
                  orderRole: "detail",
                  target: "shape.count",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Shape",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithInventoryMismatch,
        acceptance: [
          makeControlAcceptance("shape.kind", "select"),
          makeControlAcceptance("shape.count", "slider"),
        ],
        transferMode: contractTransferModeFixture,
        sectionInventory: [
          {
            entity: "Shape",
            groupingReason: "Shape setup",
            targets: ["shape.kind"],
            title: "Shape",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Control Section Inventory entry "Shape" must include a concrete groupingReason explaining why these controls belong together.',
        'Control Section Inventory entry "Shape" is missing rendered target "shape.count". The inventory must cover every product control in the section.',
      ]),
    );
  });

  it("allows explicit workflow split evidence for one target entity", () => {
    const schemaWithWorkflowSplit = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                size: {
                  defaultValue: 64,
                  label: "Size",
                  max: 128,
                  min: 16,
                  orderRole: "primary",
                  target: "object.shape.size",
                  type: "slider",
                  unit: "px",
                  variant: "continuous",
                },
              },
              title: "Shape Structure",
            },
            {
              controls: {
                count: {
                  defaultValue: 12,
                  label: "Count",
                  max: 40,
                  min: 1,
                  orderRole: "detail",
                  target: "object.shape.count",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Shape Density",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithWorkflowSplit,
        acceptance: [
          makeControlAcceptance("object.shape.size", "slider"),
          makeControlAcceptance("object.shape.count", "slider"),
        ],
        transferMode: contractTransferModeFixture,
        sectionInventory: [
          {
            entity: "Object shape",
            groupingReason: "Structure controls tune the physical footprint of the object.",
            splitReason: "Structure and density are separate workflow stages in this editor.",
            targets: ["object.shape.size"],
            title: "Shape Structure",
            workflowStage: "structure",
          },
          {
            entity: "Object shape",
            groupingReason: "Density controls tune how many objects appear after structure is set.",
            splitReason: "Density is separated from structure because users set count after the shape footprint.",
            targets: ["object.shape.count"],
            title: "Shape Density",
            workflowStage: "density",
          },
        ],
      }),
    ).toEqual([]);
  });

  it("rejects mode-gated controls split away from their selector section", () => {
    const schemaWithSplitModeBranch = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                sourceMode: {
                  defaultValue: "preset",
                  label: "Source",
                  options: [
                    { label: "Preset", value: "preset" },
                    { label: "Image", value: "image" },
                  ],
                  orderRole: "mode",
                  target: "source.mode",
                  type: "segmented",
                },
              },
              title: "Source",
            },
            {
              controls: {
                sourceUpload: {
                  accept: "image/*",
                  assetKind: "image",
                  defaultValue: null,
                  label: "Image",
                  orderRole: "input",
                  target: "source.upload",
                  type: "fileDrop",
                  visibleWhen: { equals: "image", target: "source.mode" },
                },
              },
              title: "Image",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithSplitModeBranch,
        acceptance: [
          makeControlAcceptance("source.mode", "segmented"),
          makeControlAcceptance("source.upload", "fileDrop"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Image / sourceUpload is gated by visibleWhen target "source.mode" in Source, but it belongs to the same dependency group. Keep selectors and their dependent controls in one semantic section when they describe one product entity or branch; use visibleWhen for branch-specific controls inside that section instead of splitting branch controls into their own section. Do not use disabledWhen for product controls.',
      ]),
    );
  });

  it("rejects selector branch sections even when targets do not share a prefix", () => {
    const schemaWithSplitOptionBranch = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                shapeKind: {
                  defaultValue: "generated",
                  label: "Shape",
                  options: [
                    { label: "Generated", value: "generated" },
                    { label: "Library", value: "library" },
                  ],
                  orderRole: "mode",
                  target: "shape.kind",
                  type: "segmented",
                },
              },
              title: "Shape",
            },
            {
              controls: {
                libraryAsset: {
                  defaultValue: null,
                  label: "Library",
                  orderRole: "input",
                  target: "asset.upload",
                  type: "fileDrop",
                  visibleWhen: { equals: "library", target: "shape.kind" },
                },
              },
              title: "Library",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithSplitOptionBranch,
        acceptance: [
          makeControlAcceptance("shape.kind", "segmented"),
          makeControlAcceptance("asset.upload", "fileDrop"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Library / libraryAsset is gated by visibleWhen target "shape.kind" in Shape, but it belongs to the same dependency group. Keep selectors and their dependent controls in one semantic section when they describe one product entity or branch; use visibleWhen for branch-specific controls inside that section instead of splitting branch controls into their own section. Do not use disabledWhen for product controls.',
      ]),
    );
  });
});
