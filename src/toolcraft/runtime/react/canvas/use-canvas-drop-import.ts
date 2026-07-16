"use client";

import * as React from "react";

import type {
  ToolcraftCommand,
  ToolcraftPoint,
  ToolcraftState,
} from "../../state/types";
import {
  isToolcraftImageFile,
  readImportedFile,
  readImportedImageFile,
} from "./media-file";
import {
  getCanvasDropTarget,
  getVisibleFileDropControls,
} from "./canvas-upload-routing";

function getCanvasPositionFromEvent(
  event: React.DragEvent<HTMLElement>,
  offset: ToolcraftPoint,
  zoom: number,
): ToolcraftPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  const scale = zoom / 100;

  return {
    x: (event.clientX - rect.left - rect.width / 2 - offset.x) / scale,
    y: (event.clientY - rect.top - rect.height / 2 - offset.y) / scale,
  };
}

export function useCanvasDropImport({
  dispatch,
  offset,
  setDragOver,
  size,
  state,
  uploadEnabled,
  zoom,
}: {
  dispatch: React.Dispatch<ToolcraftCommand>;
  offset: ToolcraftPoint;
  setDragOver: React.Dispatch<React.SetStateAction<boolean>>;
  size: ToolcraftState["canvas"]["size"];
  state: ToolcraftState;
  uploadEnabled: boolean;
  zoom: number;
}): React.DragEventHandler<HTMLDivElement> {
  return React.useCallback(
    (event) => {
      if (!uploadEnabled) {
        return;
      }

      event.preventDefault();
      setDragOver(false);

      const uploadedFiles = Array.from(event.dataTransfer?.files ?? []);

      if (uploadedFiles.length === 0) {
        return;
      }

      const position = getCanvasPositionFromEvent(event, offset, zoom);
      const hasFileDropControls = getVisibleFileDropControls(state).length > 0;

      uploadedFiles.forEach((uploadedFile) => {
        const targetControl = getCanvasDropTarget(state, uploadedFile);

        if (!targetControl) {
          if (hasFileDropControls || !isToolcraftImageFile(uploadedFile)) {
            return;
          }

          void readImportedImageFile(uploadedFile, size).then((importedImage) => {
            if (!importedImage) {
              return;
            }

            dispatch({
              asset: {
                assetKind: "image",
                dataUrl: importedImage.dataUrl,
                fileName: uploadedFile.name,
                mimeType: uploadedFile.type || "image/*",
                position,
                size: importedImage.size,
              },
              type: "media.import",
            });
          });
          return;
        }

        const assetKind = targetControl.assetKind === "file" ? "file" : "image";
        const replaceExisting = targetControl.multiple !== true;

        if (assetKind === "file") {
          void readImportedFile(uploadedFile).then((importedFile) => {
            if (!importedFile) {
              return;
            }

            dispatch({
              asset: {
                assetKind: "file",
                dataUrl: importedFile.dataUrl,
                fileName: uploadedFile.name,
                mimeType: uploadedFile.type || "application/octet-stream",
                position: { x: 0, y: 0 },
                sourceTarget: targetControl.target,
              },
              replaceExisting,
              type: "media.import",
            });
          });
          return;
        }

        void readImportedImageFile(uploadedFile, size).then((importedImage) => {
          if (!importedImage) {
            return;
          }

          dispatch({
            asset: {
              assetKind: "image",
              dataUrl: importedImage.dataUrl,
              fileName: uploadedFile.name,
              mimeType: uploadedFile.type || "image/*",
              position,
              size: importedImage.size,
              sourceTarget: targetControl.target,
            },
            replaceExisting,
            type: "media.import",
          });
        });
      });
    },
    [dispatch, offset, setDragOver, size, state, uploadEnabled, zoom],
  );
}
