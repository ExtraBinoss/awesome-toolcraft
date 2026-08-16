"use client";

import * as React from "react";

import { isTimelineReadyForPlayback } from "../../state/timeline-readiness";
import { useTimelineClock } from "../timeline/timeline-playback-hooks";
import {
  useToolcraftDispatch,
  useToolcraftSelector,
  useToolcraftStore,
} from "./use-toolcraft";

export function ToolcraftPlaybackClock(): null {
  const dispatch = useToolcraftDispatch();
  const store = useToolcraftStore();
  const durationSeconds = useToolcraftSelector(
    React.useCallback((state) => state.timeline.durationSeconds, []),
  );
  const isLooping = useToolcraftSelector(
    React.useCallback((state) => state.timeline.isLooping, []),
  );
  const isPlaying = useToolcraftSelector(
    React.useCallback(
      (state) =>
        state.timeline.isPlaying &&
        isTimelineReadyForPlayback(state.schema, state.mediaAssets),
      [],
    ),
  );
  const setIsPlaying = React.useCallback(
    (nextValue: React.SetStateAction<boolean>): void => {
      const resolvedValue =
        typeof nextValue === "function"
          ? nextValue(store.getState().timeline.isPlaying)
          : nextValue;

      dispatch({ isPlaying: resolvedValue, type: "timeline.setPlaying" });
    },
    [dispatch, store],
  );

  React.useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
      const state = store.getState();
      console.info("[Toolcraft timeline] root clock state", {
        durationSeconds,
        isLooping,
        isPlaying,
        mediaAssets: state.mediaAssets.length,
        playbackRequested: state.timeline.isPlaying,
        playhead: store.getPlayhead(),
        ready: isTimelineReadyForPlayback(state.schema, state.mediaAssets),
      });
    }
  }, [durationSeconds, isLooping, isPlaying, store]);

  useTimelineClock({
    durationSeconds,
    isLooping,
    isPlaying,
    isScrubbing: false,
    setIsPlaying,
    store,
  });

  return null;
}
