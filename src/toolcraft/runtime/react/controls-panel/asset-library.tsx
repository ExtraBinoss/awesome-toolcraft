"use client";

import * as React from "react";
import { FileDrop, type FileDropPreview } from "@/toolcraft/ui";
import type {
  ToolcraftAssetLibraryItem,
  ToolcraftAssetLibrarySource,
} from "../../schema/types";

export type ToolcraftAssetLibraryProps = {
  accept?: string;
  items: readonly ToolcraftAssetLibraryItem[];
  onClearUpload?: () => void;
  onUpload: (file: File) => void;
  onValueChange: (source: ToolcraftAssetLibrarySource) => void;
  uploadPreview?: FileDropPreview;
  value: ToolcraftAssetLibrarySource;
};

function sourceMatches(
  value: ToolcraftAssetLibrarySource,
  item: ToolcraftAssetLibraryItem,
): boolean {
  return value.kind === "library" && value.assetId === item.value;
}

export function AssetLibrary({
  accept = "image/*,video/*",
  items,
  onClearUpload,
  onUpload,
  onValueChange,
  uploadPreview,
  value,
}: ToolcraftAssetLibraryProps): React.JSX.Element {
  const images = items.filter((item) => item.kind === "image");
  const videos = items.filter((item) => item.kind === "video");

  const renderItem = (item: ToolcraftAssetLibraryItem) => {
    const selected = sourceMatches(value, item);
    const className = `relative aspect-video overflow-hidden rounded-md border text-left transition ${
      selected
        ? "border-[color:var(--link)] ring-2 ring-[color:color-mix(in_oklab,var(--link)_30%,transparent)]"
        : "border-[color:color-mix(in_oklab,var(--border)_18%,transparent)] hover:border-[color:var(--border)]"
    }`;
    return (
      <button
        aria-label={item.alt ?? item.value}
        className={className}
        key={item.value}
        onClick={() =>
          onValueChange({
            assetId: item.value,
            kind: "library",
            mediaType: item.kind,
          })
        }
        type="button"
      >
        {item.kind === "image" ? (
          <img alt={item.alt ?? ""} className="h-full w-full object-cover" src={item.src} />
        ) : (
          <video
            className="h-full w-full object-cover"
            loop
            muted
            playsInline
            poster={item.poster}
            src={item.src}
          />
        )}
        <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          {item.alt ?? item.value}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-3" data-slot="toolcraft-asset-library">
      <div className="space-y-1.5">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
          Computer
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            className={`rounded-md border px-2 py-1.5 text-xs ${value.kind === "webcam" ? "border-[color:var(--link)] bg-[color:color-mix(in_oklab,var(--link)_12%,transparent)]" : "border-[color:color-mix(in_oklab,var(--border)_18%,transparent)]"}`}
            onClick={() => onValueChange({ kind: "webcam" })}
            type="button"
          >
            Webcam
          </button>
          <label className="cursor-pointer rounded-md border border-[color:color-mix(in_oklab,var(--border)_18%,transparent)] px-2 py-1.5 text-center text-xs hover:border-[color:var(--border)]">
            Image
            <input
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) onUpload(file);
                event.currentTarget.value = "";
              }}
              type="file"
            />
          </label>
          <label className="cursor-pointer rounded-md border border-[color:color-mix(in_oklab,var(--border)_18%,transparent)] px-2 py-1.5 text-center text-xs hover:border-[color:var(--border)]">
            Video
            <input
              accept="video/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) onUpload(file);
                event.currentTarget.value = "";
              }}
              type="file"
            />
          </label>
        </div>
        <FileDrop
          accept={accept}
          assetKind="file"
          onClear={onClearUpload}
          onFileSelect={onUpload}
          preview={uploadPreview}
        />
      </div>
      <div className="border-t border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] pt-3">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
          Library
        </div>
        {images.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">{images.map(renderItem)}</div>
        ) : null}
        {videos.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-1.5">{videos.map(renderItem)}</div>
        ) : null}
      </div>
    </div>
  );
}
