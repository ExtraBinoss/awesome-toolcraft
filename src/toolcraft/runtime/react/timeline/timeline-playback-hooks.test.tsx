import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ToolcraftStore } from "../../state/store";
import { useTimelineClock } from "./timeline-playback-hooks";

describe("useTimelineClock", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("advances the transient playhead after playback starts", () => {
    let animationFrame: FrameRequestCallback | undefined;
    let playhead = 0;
    const setIsPlaying = vi.fn();
    const syncPlayhead = vi.fn();
    const store = {
      getPlayhead: () => playhead,
      setPlayhead: (nextPlayhead: number) => {
        playhead = nextPlayhead;
      },
      syncPlayhead,
    } as unknown as ToolcraftStore;

    vi.spyOn(window.performance, "now").mockReturnValue(0);
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      animationFrame = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const { unmount } = renderHook(() =>
      useTimelineClock({
        durationSeconds: 10,
        isLooping: false,
        isPlaying: true,
        isScrubbing: false,
        setIsPlaying,
        store,
      }),
    );

    act(() => animationFrame?.(1_000));

    expect(playhead).toBe(1);
    expect(setIsPlaying).not.toHaveBeenCalled();
    unmount();
    expect(syncPlayhead).toHaveBeenCalledOnce();
  });
});
