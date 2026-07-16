"use client";

import * as React from "react";

import { cn } from "../../../lib/utils";
import type { ActionControlOption } from "../actions/actions-control";
import type {
  FileDropImageTransform,
  FileDropImageTransformOperation,
  FileDropPreview,
} from "./file-drop-types";

export const singleImagePreviewMaxHeight = 196;

export function isDragLeavingCurrentTarget(
  event: React.DragEvent<HTMLElement>,
): boolean {
  const nextTarget = event.relatedTarget;

  return !(nextTarget instanceof Node && event.currentTarget.contains(nextTarget));
}

export function getFileInputAccept(accept: string): string {
  return accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .flatMap((part) => {
      switch (part) {
        case "gif":
          return [".gif", "image/gif"];
        case "heic":
          return [".heic", "image/heic"];
        case "heif":
          return [".heif", "image/heif"];
        case "jpg":
        case "jpeg":
          return [".jpg", ".jpeg", "image/jpeg"];
        case "png":
          return [".png", "image/png"];
        case "svg":
          return [".svg", "image/svg+xml"];
        case "tif":
        case "tiff":
          return [".tif", ".tiff", "image/tiff"];
        case "webp":
          return [".webp", "image/webp"];
        default:
          return part.startsWith(".") || part.includes("/") ? [part] : [];
      }
    })
    .join(",");
}

export function normalizeImageRotation(
  rotationDeg: number | undefined,
): 0 | 90 | 180 | 270 {
  const normalized = ((Math.round((rotationDeg ?? 0) / 90) * 90) % 360 + 360) % 360;

  return normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0;
}

export function getImageTransformStyle(
  transform: FileDropImageTransform | undefined,
  options: { center?: boolean; includeRotation?: boolean } = {},
): React.CSSProperties {
  const rotationDeg = normalizeImageRotation(transform?.rotationDeg);
  const scaleX = transform?.flipHorizontal ? -1 : 1;
  const scaleY = transform?.flipVertical ? -1 : 1;
  const transformSteps: string[] = [];

  if (options.center) {
    transformSteps.push("translate(-50%, -50%)");
  }

  if (options.includeRotation !== false && rotationDeg !== 0) {
    transformSteps.push(`rotate(${rotationDeg}deg)`);
  }

  if (scaleX !== 1 || scaleY !== 1) {
    transformSteps.push(`scale(${scaleX}, ${scaleY})`);
  }

  if (transformSteps.length === 0) {
    return {};
  }

  return {
    transform: transformSteps.join(" "),
  };
}

export function getPreviewFrameStyle(
  size: FileDropPreview["size"],
): React.CSSProperties {
  if (!size || size.height <= 0 || size.width <= 0) {
    return { width: "100%" };
  }

  return {
    aspectRatio: `${size.width} / ${size.height}`,
    maxHeight: `${singleImagePreviewMaxHeight}px`,
    width: "100%",
  };
}

export function isPreviewQuarterTurn(
  transform?: FileDropImageTransform,
): boolean {
  const rotationDeg = normalizeImageRotation(transform?.rotationDeg);

  return rotationDeg === 90 || rotationDeg === 270;
}

export function getPreviewImageStyle(
  size: FileDropPreview["size"],
  transform?: FileDropImageTransform,
): React.CSSProperties {
  const rotationDeg = normalizeImageRotation(transform?.rotationDeg);
  const rotatedQuarterTurn = rotationDeg === 90 || rotationDeg === 270;
  const rotatedWidth =
    size && size.height > 0 && size.width > 0 && rotatedQuarterTurn
      ? `${(Math.min(size.width / size.height, size.height / size.width) * 100).toFixed(4)}%`
      : "100%";

  return {
    ...getImageTransformStyle(transform, { center: true }),
    ...(rotatedQuarterTurn ? { width: rotatedWidth } : {}),
  };
}

export function getPreviewKey(item: FileDropPreview, index: number): string {
  return item.id ?? `${item.src}:${index}`;
}

export function FileDropPlusGlyph({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={cn("flex-none", className)}
      fill="none"
      viewBox="0 0 14 14"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7 2.5V11.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1" />
      <path d="M2.5 7H11.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1" />
    </svg>
  );
}

export const imageTransformActions = [
  { ariaLabel: "90° Right", icon: "rotate-cw", label: "90°", value: "rotate-right" },
  {
    ariaLabel: "Flip horizontal",
    icon: "flip-horizontal",
    label: "Flip H",
    value: "flip-horizontal",
  },
  {
    ariaLabel: "Flip vertical",
    icon: "flip-vertical",
    label: "Flip V",
    value: "flip-vertical",
  },
] satisfies readonly (ActionControlOption & {
  value: FileDropImageTransformOperation;
})[];
