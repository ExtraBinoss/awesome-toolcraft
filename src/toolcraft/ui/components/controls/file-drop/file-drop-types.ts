export type FileDropAssetKind = "file" | "image";

export type FileDropImageTransform = {
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  rotationDeg?: number;
};

export type FileDropImageTransformOperation =
  | "flip-horizontal"
  | "flip-vertical"
  | "rotate-left"
  | "rotate-right";

export type FileDropPreview = {
  alt?: string;
  assetKind?: FileDropAssetKind;
  fileName?: string;
  id?: string;
  size?: {
    height: number;
    width: number;
  };
  src: string;
  transform?: FileDropImageTransform;
};

export type FileDropPreviewEntry = {
  item: FileDropPreview;
  key: string;
};

export type FileDropControlProps = {
  accept: string;
  assetKind?: FileDropAssetKind;
  multiple?: boolean;
  onClear?: () => void;
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  onPreviewRemove?: (preview: FileDropPreview, index: number) => void;
  onPreviewReorder?: (orderedPreviews: FileDropPreview[]) => void;
  onPreviewTransform?: (
    preview: FileDropPreview,
    operation: FileDropImageTransformOperation,
  ) => void;
  preview?: FileDropPreview;
  previews?: readonly FileDropPreview[];
};
