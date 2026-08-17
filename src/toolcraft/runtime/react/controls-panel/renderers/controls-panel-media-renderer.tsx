import * as React from "react";
import { FileDropControl as FileDrop } from "@/toolcraft/ui/components/controls/file-drop/file-drop-control";
import type { FileDropPreview } from "@/toolcraft/ui/components/controls/file-drop/file-drop-types";
import { SegmentedControl } from "@/toolcraft/ui/components/controls/segmented/segmented-control";

import { isToolcraftLibraryFile, saveToolcraftMedia } from "../../../media/media-library";
import type { ToolcraftCanvasSize, ToolcraftControlSchema } from "../../../schema/types";
import type { ToolcraftCommand, ToolcraftMediaAsset } from "../../../state/types";
import {
  isToolcraftImageFile,
  readImportedFile,
  readImportedImageFile,
} from "../../canvas/media-file";
import { MediaLibraryPicker } from "../media-library-picker";

export type FileDropControlRenderArgs = {
  canvasSize: ToolcraftCanvasSize;
  control: ToolcraftControlSchema;
  dispatchCommand: (command: ToolcraftCommand) => void;
  id: string;
  mediaAssets: readonly ToolcraftMediaAsset[];
};

function MediaPickerShell({ accept, children, onLibrarySelect }: {
  accept?: string;
  children: React.ReactNode;
  onLibrarySelect: (file: File) => void;
}): React.JSX.Element {
  const [tab, setTab] = React.useState<"import" | "library">("import");
  return (
    <div className="space-y-2" data-toolcraft-media-picker>
      <SegmentedControl
        ariaLabel="Media source"
        name="Source"
        onValueChange={(value) => setTab(value === "library" ? "library" : "import")}
        options={[{ label: "Import", value: "import" }, { label: "Library", value: "library" }]}
        value={tab}
      />
      {tab === "import" ? children : <MediaLibraryPicker accept={accept} onSelect={(file) => { onLibrarySelect(file); setTab("import"); }} />}
    </div>
  );
}

export function renderFileDropControl({
  canvasSize,
  control,
  dispatchCommand,
  id,
  mediaAssets,
}: FileDropControlRenderArgs): React.ReactNode {
  const assetKind = control.assetKind === "file" ? "file" : "image";
  const previewMediaAssets = mediaAssets.filter(
    (asset) =>
      asset.sourceTarget === undefined || asset.sourceTarget === control.target,
  );
  const previewMediaAsset = previewMediaAssets[0];
  const previews = previewMediaAssets.map((asset): FileDropPreview => ({
    alt: asset.fileName,
    assetKind: asset.assetKind ?? "image",
    fileName: asset.fileName,
    id: asset.id,
    size: asset.size,
    src: asset.dataUrl,
    transform: asset.transform,
  }));
  const previewMediaIds = previewMediaAssets.map((asset) => asset.id);

  const importFile = (file: File, replaceExisting: boolean): void => {
    if (!isToolcraftLibraryFile(file) && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
      void saveToolcraftMedia(file).catch(() => undefined);
    }
    if (assetKind === "file") {
      if (isToolcraftImageFile(file)) {
        void readImportedImageFile(file, canvasSize).then((importedImage) => {
          if (!importedImage) return;
          dispatchCommand({
            asset: {
              assetKind: "image",
              dataUrl: importedImage.dataUrl,
              fileName: file.name,
              mimeType: file.type || "image/*",
              position: { x: 0, y: 0 },
              revision: file.lastModified || Date.now(),
              size: importedImage.size,
              sourceTarget: control.target,
            },
            replaceExisting,
            type: "media.import",
          });
        });
        return;
      }
      void readImportedFile(file).then((importedFile) => {
        if (!importedFile) {
          return;
        }

        dispatchCommand({
          asset: {
            assetKind: "file",
            dataUrl: importedFile.dataUrl,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            position: { x: 0, y: 0 },
            revision: file.lastModified || Date.now(),
            sourceTarget: control.target,
          },
          replaceExisting,
          type: "media.import",
        });
      });
      return;
    }

    if (!isToolcraftImageFile(file)) {
      return;
    }

    void readImportedImageFile(file, canvasSize).then((importedImage) => {
      if (!importedImage) {
        return;
      }

      dispatchCommand({
        asset: {
          assetKind: "image",
          dataUrl: importedImage.dataUrl,
          fileName: file.name,
          mimeType: file.type || "image/*",
          position: { x: 0, y: 0 },
          revision: file.lastModified || Date.now(),
          size: importedImage.size,
          sourceTarget: control.target,
        },
        replaceExisting,
        type: "media.import",
      });
    });
  };

  const accept = control.accept ?? (assetKind === "file" ? "" : "PNG, JPEG, GIF, SVG, WebP");
  const libraryAccept = control.accept ?? (assetKind === "image" ? "image/*" : undefined);
  return (
    <MediaPickerShell accept={libraryAccept} onLibrarySelect={(file) => importFile(file, true)}>
      <FileDrop
      accept={accept}
      assetKind={assetKind}
      key={id}
      multiple={control.multiple}
      onClear={
        previewMediaAsset
          ? () => {
              dispatchCommand({
                mediaId: previewMediaAsset.id,
                type: "media.delete",
              });
            }
          : undefined
      }
      onFilesSelect={(files) => {
        files.forEach((file) => importFile(file, false));
      }}
      onFileSelect={(file) => importFile(file, true)}
      onPreviewRemove={(item) => {
        if (!item.id) {
          return;
        }

        dispatchCommand({
          mediaId: item.id,
          type: "media.delete",
        });
      }}
      onPreviewReorder={(orderedPreviews) => {
        const orderedPreviewIds = orderedPreviews.flatMap((item) =>
          item.id ? [item.id] : [],
        );

        if (orderedPreviewIds.length !== previewMediaIds.length) {
          return;
        }

        const previewIdSet = new Set(previewMediaIds);
        let orderedPreviewIndex = 0;
        const mediaIds = mediaAssets.map((asset) => {
          if (!previewIdSet.has(asset.id)) {
            return asset.id;
          }

          const nextId = orderedPreviewIds[orderedPreviewIndex];
          orderedPreviewIndex += 1;
          return nextId ?? asset.id;
        });

        dispatchCommand({
          mediaIds,
          type: "media.reorder",
        });
      }}
      onPreviewTransform={(item, operation) => {
        if (!item.id) {
          return;
        }

        dispatchCommand({
          mediaId: item.id,
          operation,
          type: "media.transform",
        });
      }}
      preview={
        previewMediaAsset
          ? {
              alt: previewMediaAsset.fileName,
              id: previewMediaAsset.id,
              size: previewMediaAsset.size,
              src: previewMediaAsset.dataUrl,
              transform: previewMediaAsset.transform,
            }
          : undefined
      }
      previews={previews}
      />
    </MediaPickerShell>
  );
}

export function FileDropControlRenderer(
  props: FileDropControlRenderArgs,
): React.ReactNode {
  return renderFileDropControl(props);
}
