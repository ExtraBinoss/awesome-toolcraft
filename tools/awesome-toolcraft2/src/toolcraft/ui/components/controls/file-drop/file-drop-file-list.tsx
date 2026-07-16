"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PaperclipIcon, XIcon } from "@phosphor-icons/react";

import { cn } from "../../../lib/utils";
import { Button } from "../../primitives";
import { FileDropPlusGlyph } from "./file-drop-model";
import type { FileDropPreview, FileDropPreviewEntry } from "./file-drop-types";

type SortableFileRowProps = {
  index: number;
  isSortable: boolean;
  item: FileDropPreview;
  itemKey: string;
  onPreviewRemove?: (preview: FileDropPreview, index: number) => void;
};

function SortableFileRow({
  index,
  isSortable,
  item,
  itemKey,
  onPreviewRemove,
}: SortableFileRowProps): React.JSX.Element {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } =
    useSortable({
      disabled: !isSortable,
      id: itemKey,
    });
  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  };
  const fileName = item.fileName ?? item.alt ?? "Untitled file";

  return (
    <div
      className={cn(
        "mx-1 flex h-8 min-w-0 items-center gap-2 pr-1 pl-[7px] text-left text-sm text-[color:color-mix(in_oklab,var(--foreground)_86%,transparent)] transition-[background-color,opacity,transform] duration-150 ease-out hover:bg-[color:color-mix(in_oklab,var(--foreground)_3%,transparent)] motion-reduce:transition-none",
        isSortable && "cursor-grab touch-none select-none",
        isDragging &&
          "z-10 cursor-grabbing bg-[color:color-mix(in_oklab,var(--foreground)_5%,transparent)] opacity-90",
      )}
      data-file-upload-preview-key={itemKey}
      data-preview-dragging={isDragging ? "true" : undefined}
      data-slot="file-upload-file-item"
      onClick={(event) => {
        event.stopPropagation();
      }}
      ref={setNodeRef}
      style={style}
      {...(isSortable ? attributes : {})}
      {...(isSortable ? listeners : {})}
    >
      <PaperclipIcon
        aria-hidden="true"
        className="size-4 flex-none text-[color:color-mix(in_oklab,var(--foreground)_48%,transparent)]"
        weight="regular"
      />
      <span
        className="min-w-0 flex-1 overflow-hidden text-xs whitespace-nowrap [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)] [mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)]"
        title={fileName}
      >
        {fileName}
      </span>
      {onPreviewRemove ? (
        <Button
          aria-label={`Remove ${fileName}`}
          className="flex-none"
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

type FileDropFileListProps = {
  isSortable: boolean;
  onAddFile: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onPreviewRemove?: (preview: FileDropPreview, index: number) => void;
  previewEntries: readonly FileDropPreviewEntry[];
  previewKeys: string[];
  sensors: React.ComponentProps<typeof DndContext>["sensors"];
};

export function FileDropFileList({
  isSortable,
  onAddFile,
  onDragEnd,
  onPreviewRemove,
  previewEntries,
  previewKeys,
  sensors,
}: FileDropFileListProps): React.JSX.Element {
  return (
    <div className="w-full" data-slot="file-upload-file-list">
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        sensors={sensors}
      >
        <SortableContext items={previewKeys} strategy={verticalListSortingStrategy}>
          {previewEntries.map(({ item, key }, index) => (
            <React.Fragment key={key}>
              <SortableFileRow
                index={index}
                isSortable={isSortable}
                item={item}
                itemKey={key}
                onPreviewRemove={onPreviewRemove}
              />
              <div
                aria-hidden="true"
                className="mx-1 h-px bg-[color:color-mix(in_oklab,var(--border)_5%,transparent)]"
                data-slot="file-upload-file-divider"
              />
            </React.Fragment>
          ))}
        </SortableContext>
      </DndContext>
      <button
        aria-label="Add a new file"
        className="mx-1 box-border flex h-8 w-[calc(100%-0.5rem)] min-w-0 shrink-0 items-center justify-center gap-1.5 px-1 text-xs text-[color:color-mix(in_oklab,var(--foreground)_65%,transparent)] transition-[background-color,color] duration-150 ease-out hover:bg-[color:color-mix(in_oklab,var(--foreground)_3%,transparent)] hover:text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
        data-slot="file-upload-add-file"
        onClick={(event) => {
          event.stopPropagation();
          onAddFile();
        }}
        type="button"
      >
        <FileDropPlusGlyph className="size-3.5" />
        <span className="font-medium">Add a new file</span>
      </button>
    </div>
  );
}
