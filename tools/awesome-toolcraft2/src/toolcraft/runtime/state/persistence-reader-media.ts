import { isToolcraftPersistenceRecord } from "./persistence-shared";
import { readCanvasSize, readPoint } from "./persistence-reader-primitives";
import type { ToolcraftMediaAsset } from "./types";

function readMediaAsset(value: unknown): ToolcraftMediaAsset | undefined {
  if (
    !isToolcraftPersistenceRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.layerId !== "string" ||
    typeof value.dataUrl !== "string" ||
    typeof value.fileName !== "string" ||
    typeof value.mimeType !== "string"
  ) {
    return undefined;
  }

  const position = readPoint(value.position);

  if (!position) {
    return undefined;
  }

  const mediaAsset: ToolcraftMediaAsset = {
    dataUrl: value.dataUrl,
    fileName: value.fileName,
    id: value.id,
    layerId: value.layerId,
    mimeType: value.mimeType,
    position,
  };
  const size = readCanvasSize(value.size);

  if (value.assetKind === "file" || value.assetKind === "image") {
    mediaAsset.assetKind = value.assetKind;
  }

  if (size) {
    mediaAsset.size = size;
  }

  if (typeof value.sourceTarget === "string") {
    mediaAsset.sourceTarget = value.sourceTarget;
  }

  if (isToolcraftPersistenceRecord(value.transform)) {
    mediaAsset.transform = {};

    if (typeof value.transform.flipHorizontal === "boolean") {
      mediaAsset.transform.flipHorizontal = value.transform.flipHorizontal;
    }

    if (typeof value.transform.flipVertical === "boolean") {
      mediaAsset.transform.flipVertical = value.transform.flipVertical;
    }

    if (
      value.transform.rotationDeg === 0 ||
      value.transform.rotationDeg === 90 ||
      value.transform.rotationDeg === 180 ||
      value.transform.rotationDeg === 270
    ) {
      mediaAsset.transform.rotationDeg = value.transform.rotationDeg;
    }

    if (Object.keys(mediaAsset.transform).length === 0) {
      delete mediaAsset.transform;
    }
  }

  return mediaAsset;
}

export function readMediaAssets(value: unknown): ToolcraftMediaAsset[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.flatMap((item) => {
    const mediaAsset = readMediaAsset(item);
    return mediaAsset ? [mediaAsset] : [];
  });
}
