"use client";

import { useCallback, useRef } from "react";

export function useSurfacePreview(emitChange: (hex: string) => void) {
  const pendingSurfacePreviewHexRef = useRef<string | null>(null);

  const clearScheduledSurfacePreview = useCallback(() => {}, []);

  const flushPendingSurfacePreview = useCallback(() => {}, []);

  const scheduleSurfacePreview = useCallback(
    (nextHex: string) => {
      emitChange(nextHex);
    },
    [emitChange],
  );

  return {
    pendingSurfacePreviewHexRef,
    clearScheduledSurfacePreview,
    flushPendingSurfacePreview,
    scheduleSurfacePreview,
  };
}
