import { describe, expect, it } from "vitest";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import {
  createFileDropAcceptance,
  createMultipleFileDropSchema,
  createSingleFileDropSchema,
} from "./app-acceptance.media-upload.fixtures";

describe("Toolcraft media upload acceptance coverage", () => {
  it("requires fileDrop acceptance to prove upload, clear, reset, and image transforms", () => {
    const fileDropSchema = createSingleFileDropSchema();

    expect(
      validateContractAcceptance({
        schema: fileDropSchema,
        acceptance: [
          createFileDropAcceptance({
            automatedTestName: "source image upload and clear update media",
            browserTestName: "browser: source image upload and clear update media",
            expectedObservable: "Uploading a source image changes the media preview and Clear removes it.",
            fixture: "source image fixture",
            mediaLifecycleCoverage: ["upload", "remove"],
            userAction: "Upload a source image, then clear the preview.",
          }),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "Source / source (media.source) fileDrop acceptance must prove upload/import, clear/remove, and section or global reset restore default source media or remove uploaded source media when no default exists.",
        "Source / source (media.source) image fileDrop acceptance must prove rotate and flip actions update runtime media transform metadata and that preview, renderer, or export consumes the transform.",
      ]),
    );
  });

  it("requires predefined fileDrop media acceptance to prove attached default restore", () => {
    const fileDropSchema = createSingleFileDropSchema({ withDefaultAsset: true });

    expect(
      validateContractAcceptance({
        schema: fileDropSchema,
        acceptance: [
          createFileDropAcceptance({
            automatedTestName: "source image upload reset lifecycle",
            browserTestName: "browser: source image upload reset lifecycle",
            expectedObservable: "Upload, clear, reset, rotate, and flip update the source preview and renderer.",
            fixture: "source image fixture",
            mediaLifecycleCoverage: [
              "upload",
              "remove",
              "reset",
              "rotate",
              "flip",
              "transform-output",
            ],
            userAction: "Upload a source image, clear it, use Reset controls, rotate 90°, flip horizontal, and verify runtime media transform metadata is consumed by preview.",
          }),
        ],
      }),
    ).toContain(
      "Source / source (media.source) fileDrop acceptance must prove predefined media.defaultAssets render as attached files, can be removed to an empty source/canvas state, and are restored by section or global Reset.",
    );
  });

  it("accepts fileDrop lifecycle coverage that includes reset and image transforms", () => {
    const fileDropSchema = createSingleFileDropSchema();

    const errors = validateContractAcceptance({
      schema: fileDropSchema,
      acceptance: [
        createFileDropAcceptance({
          automatedTestName: "source image upload clear and reset update media",
          browserTestName: "browser: source image upload clear and reset update media",
          expectedObservable: "El resultado visual refleja el ciclo de medios completo.",
          fixture: "source image fixture",
          mediaLifecycleCoverage: [
            "upload",
            "remove",
            "reset",
            "rotate",
            "flip",
            "transform-output",
          ],
          userAction: "Ejecutar el flujo completo del medio.",
        }),
      ],
    });

    expect(
      errors.filter((error) => error.includes("fileDrop acceptance")),
    ).toEqual([]);
  });

  it("requires multiple fileDrop acceptance to prove runtime media reorder", () => {
    const fileDropSchema = createMultipleFileDropSchema();

    expect(
      validateContractAcceptance({
        schema: fileDropSchema,
        acceptance: [
          createFileDropAcceptance({
            automatedTestName: "source images upload clear reset and transform",
            browserTestName: "browser: source images upload clear reset and transform",
            expectedObservable: "Uploading source images changes the media preview; rotate and flip actions update runtime media transform metadata and rendered output; Clear and Reset controls remove media.",
            fixture: "source images fixture",
            id: "media.sources",
            mediaLifecycleCoverage: [
              "upload",
              "remove",
              "reset",
              "rotate",
              "flip",
              "transform-output",
            ],
            target: "media.sources",
            userAction: "Upload two source images, rotate one, flip it, clear the images, and use Reset controls.",
          }),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "Source / sources (media.sources) multiple fileDrop acceptance must prove thumbnail/file reorder updates runtime media order and that preview, renderer, or export consumes that order.",
      ]),
    );

    expect(
      validateContractAcceptance({
        schema: fileDropSchema,
        acceptance: [
          createFileDropAcceptance({
            automatedTestName: "source images upload reorder transform and reset",
            browserTestName: "browser: source images upload reorder transform and reset",
            expectedObservable: "Uploading source images changes the preview; drag reorder updates runtime media order used by rendered output; rotate and flip update runtime media transform metadata used by export; Clear, section reset, and global Reset controls remove media.",
            fixture: "source images fixture",
            id: "media.sources",
            mediaLifecycleCoverage: [
              "upload",
              "remove",
              "reset",
              "rotate",
              "flip",
              "transform-output",
              "reorder",
              "order-output",
            ],
            target: "media.sources",
            userAction: "Upload two source images, drag to reorder thumbnails, rotate and flip the selected image, clear them, then use section reset and Reset controls.",
          }),
        ],
      }),
    ).toEqual([]);
  });
});
