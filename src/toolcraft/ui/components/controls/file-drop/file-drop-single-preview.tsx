"use client";

import * as React from "react";
import { XIcon } from "@phosphor-icons/react";

import { cn } from "../../../lib/utils";
import { Button } from "../../primitives";
import {
  getPreviewFrameStyle,
  getPreviewImageStyle,
  isPreviewQuarterTurn,
} from "./file-drop-model";
import type { FileDropPreview } from "./file-drop-types";

type FileDropSinglePreviewProps = {
  onClear?: () => void;
  preview?: FileDropPreview;
};

export function FileDropSinglePreview({
  onClear,
  preview,
}: FileDropSinglePreviewProps): React.JSX.Element {
  return (
    <>
      {preview ? (
        <div
          className="relative w-full max-w-full overflow-hidden rounded-[calc(var(--radius-lg)-4px)]"
          data-slot="file-upload-preview-frame"
          style={getPreviewFrameStyle(preview.size)}
        >
          <img
            alt={preview.alt ?? ""}
            className={cn(
              "absolute top-1/2 left-1/2 block h-auto object-contain",
              isPreviewQuarterTurn(preview.transform) ? "max-w-none" : "max-h-full max-w-full",
            )}
            draggable={false}
            height={preview.size?.height}
            src={preview.src}
            style={getPreviewImageStyle(preview.size, preview.transform)}
            width={preview.size?.width}
          />
        </div>
      ) : null}
      {onClear ? (
        <Button
          aria-label="Remove image"
          className="absolute top-3 right-3"
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <XIcon className="drop-shadow-[0_2px_1px_color-mix(in_oklab,var(--background)_80%,transparent)]" />
        </Button>
      ) : null}
    </>
  );
}
