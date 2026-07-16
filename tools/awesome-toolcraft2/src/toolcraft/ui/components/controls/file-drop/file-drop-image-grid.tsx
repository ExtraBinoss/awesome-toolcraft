"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { XIcon } from "@phosphor-icons/react";

import { cn } from "../../../lib/utils";
import { Button } from "../../primitives";
import {
  FileDropPlusGlyph,
  getImageTransformStyle,
} from "./file-drop-model";
import type { FileDropPreview, FileDropPreviewEntry } from "./file-drop-types";

type SortablePreviewTileProps = {
  index: number;
  isSortable: boolean;
  item: FileDropPreview;
  itemKey: string;
  onPreviewRemove?: (preview: FileDropPreview, index: number) => void;
  onPreviewSelect?: (itemKey: string) => void;
  selected?: boolean;
};

function SortablePreviewTile({
  index,
  isSortable,
  item,
  itemKey,
  onPreviewRemove,
  onPreviewSelect,
  selected = false,
}: SortablePreviewTileProps): React.JSX.Element {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } =
    useSortable({
      disabled: !isSortable,
      id: itemKey,
    });
  const sortableTransform = transform
    ? {
        ...transform,
        scaleX: isDragging ? 1.035 : transform.scaleX,
        scaleY: isDragging ? 1.035 : transform.scaleY,
      }
    : null;
  const style: React.CSSProperties = {
    transform: sortableTransform ? CSS.Transform.toString(sortableTransform) : undefined,
    transition,
  };

  return (
    <div
      className={cn(
        "relative aspect-square min-w-0 overflow-hidden rounded-[calc(var(--radius-lg)-4px)] bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] transition-[transform,box-shadow,opacity,border-color] duration-180 ease-out motion-reduce:transition-none",
        isSortable &&
          "cursor-grab touch-none select-none will-change-transform hover:shadow-[0_8px_18px_color-mix(in_oklab,var(--background)_30%,transparent)]",
        selected &&
          "ring-2 ring-[color:color-mix(in_oklab,var(--link)_72%,transparent)] ring-offset-2 ring-offset-[color:var(--background)]",
        isDragging &&
          "z-10 cursor-grabbing opacity-90 shadow-[0_12px_24px_color-mix(in_oklab,var(--background)_55%,transparent)]",
      )}
      data-file-upload-preview-key={itemKey}
      data-preview-dragging={isDragging ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-slot="file-upload-preview-item"
      onClick={(event) => {
        event.stopPropagation();
        onPreviewSelect?.(itemKey);
      }}
      ref={setNodeRef}
      style={style}
      {...(isSortable ? attributes : {})}
      {...(isSortable ? listeners : {})}
    >
      <img
        alt={item.alt ?? ""}
        className="size-full object-cover"
        draggable={false}
        height={item.size?.height}
        src={item.src}
        style={getImageTransformStyle(item.transform)}
        width={item.size?.width}
      />
      {onPreviewRemove ? (
        <Button
          aria-label={`Remove ${item.alt ?? "image"}`}
          className="absolute top-0.5 right-0.5"
          onClick={(event) => {
            event.stopPropagation();
            onPreviewRemove(item, index);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <XIcon className="drop-shadow-[0_2px_1px_color-mix(in_oklab,var(--background)_80%,transparent)]" />
        </Button>
      ) : null}
    </div>
  );
}

type FileDropImageGridProps = {
  isSortable: boolean;
  onAddImages: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onPreviewRemove?: (preview: FileDropPreview, index: number) => void;
  onPreviewSelect: (itemKey: string) => void;
  previewEntries: readonly FileDropPreviewEntry[];
  previewKeys: string[];
  selectedPreviewKey: string | null;
  sensors: React.ComponentProps<typeof DndContext>["sensors"];
};

export function FileDropImageGrid({
  isSortable,
  onAddImages,
  onDragEnd,
  onPreviewRemove,
  onPreviewSelect,
  previewEntries,
  previewKeys,
  selectedPreviewKey,
  sensors,
}: FileDropImageGridProps): React.JSX.Element {
  return (
    <div className="grid w-full grid-cols-4 gap-2" data-slot="file-upload-preview-grid">
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        sensors={sensors}
      >
        <SortableContext items={previewKeys} strategy={rectSortingStrategy}>
          {previewEntries.map(({ item, key }, index) => (
            <SortablePreviewTile
              index={index}
              isSortable={isSortable}
              item={item}
              itemKey={key}
              key={key}
              onPreviewRemove={onPreviewRemove}
              onPreviewSelect={onPreviewSelect}
              selected={selectedPreviewKey === key}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        aria-label="Add image files"
        className="flex aspect-square min-w-0 items-center justify-center rounded-[calc(var(--radius-lg)-4px)] border border-[color:color-mix(in_oklab,var(--border)_5%,transparent)] bg-[color:color-mix(in_oklab,var(--foreground)_4%,transparent)] text-[color:color-mix(in_oklab,var(--foreground)_65%,transparent)] transition-[background-color,border-color,color] duration-150 ease-out hover:border-[color:color-mix(in_oklab,var(--border)_8%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_9%,transparent)] hover:text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
        data-slot="file-upload-add-preview"
        onClick={(event) => {
          event.stopPropagation();
          onAddImages();
        }}
        type="button"
      >
        <FileDropPlusGlyph className="size-3.5" />
      </button>
    </div>
  );
}
