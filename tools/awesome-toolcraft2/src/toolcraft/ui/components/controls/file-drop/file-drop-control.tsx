"use client";

import * as React from "react";
import {
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { cn } from "../../../lib/utils";
import { ActionsControl } from "../actions/actions-control";
import { Field } from "../../primitives";
import { FileDropEmptyState } from "./file-drop-empty-state";
import { FileDropFileList } from "./file-drop-file-list";
import { FileDropImageGrid } from "./file-drop-image-grid";
import {
  getFileInputAccept,
  getPreviewKey,
  imageTransformActions,
  isDragLeavingCurrentTarget,
} from "./file-drop-model";
import { FileDropSinglePreview } from "./file-drop-single-preview";
import type {
  FileDropControlProps,
  FileDropImageTransformOperation,
} from "./file-drop-types";

export function FileDropControl({
  accept,
  assetKind = "image",
  multiple = false,
  onClear,
  onFileSelect,
  onFilesSelect,
  onPreviewRemove,
  onPreviewReorder,
  onPreviewTransform,
  preview,
  previews,
}: FileDropControlProps): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [selectedPreviewKey, setSelectedPreviewKey] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const previewItems = previews ?? (preview ? [preview] : []);
  const hasPreview = previewItems.some((item) => Boolean(item.src));
  const shouldRenderPreviewGrid = multiple && previewItems.length > 1;
  const shouldRenderFileList = assetKind === "file" && hasPreview;
  const previewEntries = previewItems.map((item, index) => ({
    item,
    key: getPreviewKey(item, index),
  }));
  const previewKeys = previewEntries.map((entry) => entry.key);
  const requiresImageSelection = assetKind === "image" && multiple && previewEntries.length > 1;
  const selectedPreviewEntry = requiresImageSelection
    ? previewEntries.find((entry) => entry.key === selectedPreviewKey)
    : previewEntries[0];
  const shouldRenderImageActions =
    assetKind === "image" &&
    hasPreview &&
    Boolean(onPreviewTransform) &&
    Boolean(selectedPreviewEntry) &&
    (!requiresImageSelection || selectedPreviewKey !== null);

  React.useEffect(() => {
    if (!selectedPreviewKey) {
      return;
    }

    if (!requiresImageSelection || !previewKeys.includes(selectedPreviewKey)) {
      setSelectedPreviewKey(null);
    }
  }, [previewKeys, requiresImageSelection, selectedPreviewKey]);

  function handleFiles(fileList: FileList | readonly File[] | undefined): void {
    const files = Array.from(fileList ?? []);

    if (files.length === 0) {
      return;
    }

    if (multiple) {
      if (onFilesSelect) {
        onFilesSelect(files);
        return;
      }

      files.forEach((file) => onFileSelect?.(file));
      return;
    }

    onFileSelect?.(files[0]);
  }

  function openFileDialog(): void {
    inputRef.current?.click();
  }

  function handleDropTargetClick(event: React.MouseEvent<HTMLDivElement>): void {
    event.preventDefault();
    openFileDialog();
  }

  function handleDropTargetKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openFileDialog();
  }

  function handlePreviewDragEnd(event: DragEndEvent): void {
    const activeKey = String(event.active.id);
    const overKey = event.over ? String(event.over.id) : null;

    if (!onPreviewReorder || !overKey || activeKey === overKey) {
      return;
    }

    const activeIndex = previewKeys.indexOf(activeKey);
    const overIndex = previewKeys.indexOf(overKey);

    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
      return;
    }

    onPreviewReorder(
      arrayMove(previewEntries, activeIndex, overIndex).map((entry) => entry.item),
    );
  }

  function runImageTransform(operation: FileDropImageTransformOperation): void {
    if (!selectedPreviewEntry) {
      return;
    }

    onPreviewTransform?.(selectedPreviewEntry.item, operation);
  }

  return (
    <Field className="min-w-0" style={{ gap: "6px" }}>
      <input
        accept={getFileInputAccept(accept)}
        aria-hidden="true"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.currentTarget.files ?? undefined);
          event.currentTarget.value = "";
        }}
        multiple={multiple}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <div
        aria-label={
          hasPreview
            ? multiple
              ? assetKind === "file"
                ? "Drop files"
                : "Drop image files"
              : assetKind === "file"
                ? "Replace file"
                : "Replace image file"
            : multiple
              ? assetKind === "file"
                ? "Browse files"
                : "Browse image files"
              : assetKind === "file"
                ? "Browse file"
                : "Browse image file"
        }
        className={cn(
          "group/file-upload relative flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[color:color-mix(in_oklab,var(--border)_18%,transparent)] bg-[color:color-mix(in_oklab,var(--foreground)_3%,transparent)] text-center shadow-none transition-[background-color,border-color,box-shadow] duration-150 ease-out data-[drag-over=true]:border-[color:color-mix(in_oklab,var(--link)_28%,transparent)] data-[drag-over=true]:bg-[color:color-mix(in_oklab,var(--link)_13%,transparent)] data-[drag-over=true]:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]",
          !shouldRenderFileList &&
            "hover:border-[color:color-mix(in_oklab,var(--border)_35%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)]",
          hasPreview
            ? shouldRenderFileList
              ? "overflow-hidden p-1.5"
              : "overflow-hidden p-2"
            : "px-3 py-3",
        )}
        data-drag-over={dragOver}
        onClick={handleDropTargetClick}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(event) => {
          if (isDragLeavingCurrentTarget(event)) {
            setDragOver(false);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          handleFiles(event.dataTransfer?.files ?? undefined);
        }}
        onKeyDown={handleDropTargetKeyDown}
        role="button"
        tabIndex={0}
      >
        {shouldRenderFileList ? (
          <FileDropFileList
            isSortable={Boolean(onPreviewReorder) && previewEntries.length > 1}
            onAddFile={openFileDialog}
            onDragEnd={handlePreviewDragEnd}
            onPreviewRemove={onPreviewRemove}
            previewEntries={previewEntries}
            previewKeys={previewKeys}
            sensors={sensors}
          />
        ) : shouldRenderPreviewGrid ? (
          <FileDropImageGrid
            isSortable={Boolean(onPreviewReorder)}
            onAddImages={openFileDialog}
            onDragEnd={handlePreviewDragEnd}
            onPreviewRemove={onPreviewRemove}
            onPreviewSelect={(key) => {
              setSelectedPreviewKey((currentKey) => (currentKey === key ? null : key));
            }}
            previewEntries={previewEntries}
            previewKeys={previewKeys}
            selectedPreviewKey={selectedPreviewKey}
            sensors={sensors}
          />
        ) : hasPreview ? (
          <FileDropSinglePreview onClear={onClear} preview={previewItems[0]} />
        ) : (
          <FileDropEmptyState assetKind={assetKind} />
        )}
      </div>
      {shouldRenderImageActions ? (
        <ActionsControl
          actions={imageTransformActions}
          buttonColumns={3}
          name="Image transforms"
          onAction={(operation) =>
            runImageTransform(operation as FileDropImageTransformOperation)
          }
          showLabel={false}
        />
      ) : null}
    </Field>
  );
}
