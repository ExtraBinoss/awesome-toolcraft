'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import { getToolcraftTimelineLoopTime } from '../../state/timeline-loop';
import {
  clampToolcraftTimelineTime,
  toolcraftTimelineScrubStepSeconds,
} from '../../state/timeline-values';
import type { ToolcraftStore } from '../../state/store';

type TimelineClockOptions = {
  durationSeconds: number;
  isLooping: boolean;
  isPlaying: boolean;
  isScrubbing: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  store: ToolcraftStore;
};

type TimelineScrubberOptions = {
  currentTimeSeconds: number;
  disabled?: boolean;
  durationSeconds: number;
  setCurrentTimeSeconds: React.Dispatch<React.SetStateAction<number>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
};

type TimelineScrubberResult = {
  handleScrubKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  handleScrubPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleScrubPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleScrubPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  isScrubbing: boolean;
  stripRef: React.RefObject<HTMLDivElement | null>;
};

function getKeyboardScrubTime({
  currentTimeSeconds,
  durationSeconds,
  key,
}: {
  currentTimeSeconds: number;
  durationSeconds: number;
  key: string;
}): number | null {
  if (key === 'ArrowLeft') {
    return currentTimeSeconds - toolcraftTimelineScrubStepSeconds;
  }

  if (key === 'ArrowRight') {
    return currentTimeSeconds + toolcraftTimelineScrubStepSeconds;
  }

  if (key === 'Home') {
    return 0;
  }

  if (key === 'End') {
    return durationSeconds;
  }

  return null;
}

export function useTimelineClock({
  durationSeconds,
  isLooping,
  isPlaying,
  isScrubbing,
  setIsPlaying,
  store,
}: TimelineClockOptions): void {
  useEffect(() => {
    const debug = import.meta.env.DEV && import.meta.env.MODE !== 'test';

    if (
      !isPlaying ||
      isScrubbing ||
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      if (debug) {
        console.info('[Toolcraft timeline] RAF blocked', {
          hasWindow: typeof window !== 'undefined',
          isPlaying,
          isScrubbing,
          requestAnimationFrame: typeof window === 'undefined'
            ? 'unavailable'
            : typeof window.requestAnimationFrame,
        });
      }
      return;
    }

    let frame = 0;
    let previousTimestamp = window.performance.now();
    if (debug) {
      console.info('[Toolcraft timeline] RAF started', {
        durationSeconds,
        isLooping,
        playhead: store.getPlayhead(),
        startedAt: previousTimestamp,
      });
    }
    const tick = (timestamp: number) => {
      const elapsedSeconds = Math.max(0, (timestamp - previousTimestamp) / 1000);

      previousTimestamp = timestamp;
      const nextValue = store.getPlayhead() + elapsedSeconds;

      if (nextValue < durationSeconds) {
        store.setPlayhead(nextValue, timestamp);
        frame = window.requestAnimationFrame(tick);
        return;
      }

      if (isLooping) {
        store.setPlayhead(
          getToolcraftTimelineLoopTime({
            currentTimeSeconds: nextValue,
            durationSeconds,
          }),
          timestamp,
        );
        frame = window.requestAnimationFrame(tick);
        return;
      }

      store.setPlayhead(durationSeconds, timestamp);
      store.syncPlayhead();
      setIsPlaying(false);
    };

    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      store.syncPlayhead();
      if (debug) {
        console.info('[Toolcraft timeline] RAF stopped', {
          playhead: store.getPlayhead(),
        });
      }
    };
  }, [
    durationSeconds,
    isLooping,
    isPlaying,
    isScrubbing,
    setIsPlaying,
    store,
  ]);
}

export function useTimelineScrubber({
  currentTimeSeconds,
  disabled = false,
  durationSeconds,
  setCurrentTimeSeconds,
  setIsPlaying,
}: TimelineScrubberOptions): TimelineScrubberResult {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [previousDisabled, setPreviousDisabled] = useState(disabled);
  const stripRef = useRef<HTMLDivElement | null>(null);

  if (disabled !== previousDisabled) {
    setPreviousDisabled(disabled);
    if (disabled && isScrubbing) {
      setIsScrubbing(false);
    }
  }

  const getScrubGeometry = (): { rect: DOMRect; trackStart: number; trackWidth: number } | null => {
    const rect = stripRef.current?.getBoundingClientRect();

    if (!(rect && rect.width > 0)) {
      return null;
    }

    const rawTrackStart = Number.parseFloat(stripRef.current?.dataset.timelineTrackStart ?? '0');
    const trackStart = Number.isFinite(rawTrackStart) ? rawTrackStart : 0;
    const rawTrackEndInset = Number.parseFloat(stripRef.current?.dataset.timelineTrackEnd ?? '0');
    const trackEndInset = Number.isFinite(rawTrackEndInset) ? rawTrackEndInset : 0;
    const trackWidth = Math.max(1, rect.width - trackStart - trackEndInset);

    return { rect, trackStart, trackWidth };
  };
  const canStartScrubbingFromPointerEvent = (
    event: React.PointerEvent<HTMLDivElement>,
  ): boolean => {
    const geometry = getScrubGeometry();

    if (!geometry) {
      return false;
    }

    const isExpandedTimeline = geometry.trackStart > 0;
    const startedFromExpandedPlayhead =
      event.target instanceof Element &&
      event.target.closest(
        [
          '[data-slot="timeline-expanded-playhead"]',
          '[data-slot="timeline-expanded-playhead-handle"]',
          '[data-slot="timeline-expanded-playhead-hit-area"]',
        ].join(','),
      );

    if (isExpandedTimeline) {
      return Boolean(startedFromExpandedPlayhead);
    }

    return event.clientX >= geometry.rect.left + geometry.trackStart;
  };
  const setCurrentTimeFromClientX = (clientX: number): void => {
    const geometry = getScrubGeometry();

    if (!geometry) {
      return;
    }

    const { rect, trackStart, trackWidth } = geometry;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left - trackStart) / trackWidth));

    setCurrentTimeSeconds(
      clampToolcraftTimelineTime(durationSeconds * ratio, durationSeconds),
    );
  };
  const handleScrubKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (disabled) {
      return;
    }

    const nextTime = getKeyboardScrubTime({
      currentTimeSeconds,
      durationSeconds,
      key: event.key,
    });

    if (nextTime === null) {
      return;
    }

    event.preventDefault();
    setCurrentTimeSeconds(clampToolcraftTimelineTime(nextTime, durationSeconds));
  };
  const handleScrubPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (disabled || !canStartScrubbingFromPointerEvent(event)) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPlaying(false);
    setIsScrubbing(true);
    setCurrentTimeFromClientX(event.clientX);
  };
  const handleScrubPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!isScrubbing) {
      return;
    }

    setCurrentTimeFromClientX(event.clientX);
  };
  const handleScrubPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!isScrubbing) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsScrubbing(false);
  };

  return {
    handleScrubKeyDown,
    handleScrubPointerDown,
    handleScrubPointerMove,
    handleScrubPointerUp,
    isScrubbing,
    stripRef,
  };
}
