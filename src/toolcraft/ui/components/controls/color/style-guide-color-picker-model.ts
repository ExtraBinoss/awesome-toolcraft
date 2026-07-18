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

type ColorModelOptions = {
  value: string;
  isSurfaceDragging: boolean;
  hueDragStartHexRef: MutableRefObject<string | null>;
  isHexInputFocusedRef: MutableRefObject<boolean>;
  pendingSurfaceCommitHexRef: MutableRefObject<string | null>;
  pendingSurfaceBaseHexRef: MutableRefObject<string | null>;
  onChange: (hex: string) => void;
};

export function useColorModel({
  value,
  isSurfaceDragging,
  hueDragStartHexRef,
  isHexInputFocusedRef,
  pendingSurfaceCommitHexRef,
  pendingSurfaceBaseHexRef,
  onChange,
}: ColorModelOptions) {
  const normalizedHex = normalizeHexColor(value) ?? "#000000";
  const [optimisticColor, setOptimisticColor] = useState<HsvColor>(() => hexToHsv(normalizedHex));
  const [draftHexValue, setDraftHexValue] = useState(normalizedHex.toUpperCase());
  const latestHsvRef = useRef(optimisticColor);
  const lastEmittedHexRef = useRef(normalizedHex);
  const rafIdRef = useRef<number | null>(null);
  const pendingHexRef = useRef<string | null>(null);

  const applyOptimisticColor = useCallback(
    (nextColor: HsvColor, options?: { updateDraft?: boolean }) => {
      latestHsvRef.current = nextColor;
      setOptimisticColor(nextColor);
      const nextHex = hsvToHex(nextColor);
      if (options?.updateDraft !== false) setDraftHexValue(nextHex.toUpperCase());
      return nextHex;
    },
    [],
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

      const isDragging = isSurfaceDragging || hueDragStartHexRef.current !== null;

      if (isDragging) {
        pendingHexRef.current = nextHex;
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            if (pendingHexRef.current !== null) {
              const hexToEmit = pendingHexRef.current;
              lastEmittedHexRef.current = hexToEmit;
              onChange(hexToEmit);
              pendingHexRef.current = null;
            }
          });
        }
      } else {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        pendingHexRef.current = null;
        lastEmittedHexRef.current = nextHex;
        onChange(nextHex);
      }
    },
    [onChange, isSurfaceDragging, hueDragStartHexRef]
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
    };
  }, []);

  useEffect(() => {
    latestHsvRef.current = optimisticColor;
  }, [optimisticColor]);

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
