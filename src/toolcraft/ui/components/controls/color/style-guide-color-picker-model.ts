"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
  type HsvColor,
} from "../../../lib/style-guide-color-utils";
import {
  calculateHexDistance,
  resolveHsvFromHex,
} from "./style-guide-color-picker-color-utils";

const PENDING_SURFACE_ACK_RGB_DISTANCE_THRESHOLD = 8;
const COLOR_PREVIEW_INTERVAL_MS = 1_000 / 30;

type ColorModelOptions = {
  value: string;
  isSurfaceDragging: boolean;
  hueDragStartHexRef: MutableRefObject<string | null>;
  surfaceDragStartHexRef: MutableRefObject<string | null>;
  isHexInputFocusedRef: MutableRefObject<boolean>;
  pendingSurfaceCommitHexRef: MutableRefObject<string | null>;
  pendingSurfaceBaseHexRef: MutableRefObject<string | null>;
  onChange: (hex: string) => void;
};

export function useColorModel({
  value,
  isSurfaceDragging,
  hueDragStartHexRef,
  surfaceDragStartHexRef,
  isHexInputFocusedRef,
  pendingSurfaceCommitHexRef,
  pendingSurfaceBaseHexRef,
  onChange,
}: ColorModelOptions) {
  const normalizedHex = normalizeHexColor(value) ?? "#000000";
  const [optimisticColor, setOptimisticColor] = useState<HsvColor>(() => hexToHsv(normalizedHex));
  const [draftHexValue, setDraftHexValue] = useState(() => normalizedHex.toUpperCase());
  const latestHsvRef = useRef(optimisticColor);
  const lastEmittedHexRef = useRef(normalizedHex);
  const rafIdRef = useRef<number | null>(null);
  const pendingHexRef = useRef<string | null>(null);
  const lastEmitTimestampRef = useRef(0);
  const optimisticRafIdRef = useRef<number | null>(null);
  const pendingOptimisticColorRef = useRef<HsvColor | null>(null);
  const pendingDraftHexRef = useRef<string | null>(null);

  const scheduleOptimisticState = useCallback((nextColor: HsvColor, updateDraft: boolean) => {
    pendingOptimisticColorRef.current = nextColor;
    pendingDraftHexRef.current = updateDraft ? hsvToHex(nextColor).toUpperCase() : null;
    if (optimisticRafIdRef.current !== null) return;

    optimisticRafIdRef.current = requestAnimationFrame(() => {
      optimisticRafIdRef.current = null;
      const pendingColor = pendingOptimisticColorRef.current;
      const pendingDraft = pendingDraftHexRef.current;
      pendingOptimisticColorRef.current = null;
      pendingDraftHexRef.current = null;
      if (pendingColor) setOptimisticColor(pendingColor);
      if (pendingDraft) setDraftHexValue(pendingDraft);
    });
  }, []);

  const applyOptimisticColor = useCallback(
    (nextColor: HsvColor, options?: { updateDraft?: boolean }) => {
      latestHsvRef.current = nextColor;
      const nextHex = hsvToHex(nextColor);
      scheduleOptimisticState(nextColor, options?.updateDraft !== false);
      return nextHex;
    },
    [scheduleOptimisticState],
  );

  const applyOptimisticHex = useCallback(
    (nextHex: string, options?: { updateDraft?: boolean }) => {
      const normalizedNextHex = normalizeHexColor(nextHex);
      if (!normalizedNextHex) return null;
      return applyOptimisticColor(
        resolveHsvFromHex(normalizedNextHex, latestHsvRef.current),
        options,
      );
    },
    [applyOptimisticColor],
  );

  const emitChange = useCallback(
    (nextHex: string) => {
      if (nextHex === lastEmittedHexRef.current) return;

      const isDragging =
        surfaceDragStartHexRef.current !== null || hueDragStartHexRef.current !== null;

      if (isDragging) {
        pendingHexRef.current = nextHex;
        if (rafIdRef.current === null) {
          const flushPreview = (timestamp: number) => {
            if (timestamp - lastEmitTimestampRef.current < COLOR_PREVIEW_INTERVAL_MS) {
              rafIdRef.current = requestAnimationFrame(flushPreview);
              return;
            }

            rafIdRef.current = null;
            if (pendingHexRef.current === null) return;
            const hexToEmit = pendingHexRef.current;
            pendingHexRef.current = null;
            lastEmitTimestampRef.current = timestamp;
            lastEmittedHexRef.current = hexToEmit;
            onChange(hexToEmit);
          };
          rafIdRef.current = requestAnimationFrame(flushPreview);
        }
      } else {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        pendingHexRef.current = null;
        lastEmitTimestampRef.current = performance.now();
        lastEmittedHexRef.current = nextHex;
        onChange(nextHex);
      }
    },
    [hueDragStartHexRef, onChange, surfaceDragStartHexRef]
  );

  useEffect(() => {
    const isDragging = isSurfaceDragging || hueDragStartHexRef.current !== null;
    if (!isDragging) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (pendingHexRef.current !== null) {
        const hexToEmit = pendingHexRef.current;
        lastEmitTimestampRef.current = performance.now();
        lastEmittedHexRef.current = hexToEmit;
        onChange(hexToEmit);
        pendingHexRef.current = null;
      }
    }
  }, [isSurfaceDragging, hueDragStartHexRef, onChange]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (optimisticRafIdRef.current !== null) {
        cancelAnimationFrame(optimisticRafIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isSurfaceDragging || hueDragStartHexRef.current !== null || isHexInputFocusedRef.current)
      return;

    const pendingCommitHex = pendingSurfaceCommitHexRef.current;
    const pendingBaseHex = pendingSurfaceBaseHexRef.current;
    if (pendingCommitHex) {
      const distance = calculateHexDistance(normalizedHex, pendingCommitHex);
      if (
        normalizedHex === pendingCommitHex ||
        distance <= PENDING_SURFACE_ACK_RGB_DISTANCE_THRESHOLD
      ) {
        pendingSurfaceCommitHexRef.current = null;
        pendingSurfaceBaseHexRef.current = null;
        lastEmittedHexRef.current = normalizedHex;
        setDraftHexValue(normalizedHex.toUpperCase());
        return;
      }
      if (pendingBaseHex && normalizedHex === pendingBaseHex) return;
      pendingSurfaceCommitHexRef.current = null;
      pendingSurfaceBaseHexRef.current = null;
    }

    const nextColor = resolveHsvFromHex(normalizedHex, latestHsvRef.current);
    latestHsvRef.current = nextColor;
    lastEmittedHexRef.current = normalizedHex;
    setOptimisticColor(nextColor);
    setDraftHexValue(normalizedHex.toUpperCase());
  }, [
    hueDragStartHexRef,
    isHexInputFocusedRef,
    isSurfaceDragging,
    normalizedHex,
    pendingSurfaceBaseHexRef,
    pendingSurfaceCommitHexRef,
  ]);

  return {
    normalizedHex,
    optimisticColor,
    draftHexValue,
    setDraftHexValue,
    latestHsvRef,
    applyOptimisticColor,
    applyOptimisticHex,
    emitChange,
  };
}
