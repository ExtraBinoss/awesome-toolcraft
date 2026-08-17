import { act, fireEvent, render } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { appSchema } from "@/tools/gradient-generator/app-schema";
import { appSchema as asciiLabSchema } from "@/tools/ascii-lab/app-schema";
import { createToolcraftStore, type ToolcraftStore } from "../../state/store";
import { ToolcraftStoreProvider } from "../app-shell/toolcraft-store-provider";
import { ToolcraftPlaybackClock } from "../app-shell/toolcraft-playback-clock";
import { useToolcraftPlayhead } from "../app-shell/use-toolcraft";
import { useTimelineClock } from "./timeline-playback-hooks";
import { TimelinePanel } from "./timeline-panel";

describe("timeline playhead integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("publishes a visible Jotai playhead through RAF without scroll at no more than 30 Hz", () => {
    vi.useFakeTimers();

    let currentTimestamp = 0;
    vi.spyOn(window.performance, "now").mockImplementation(() => currentTimestamp);

    let nextAnimationFrameId = 0;
    const animationFrames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback): number => {
        const id = ++nextAnimationFrameId;
        animationFrames.set(id, callback);
        return id;
      },
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number): void => {
      animationFrames.delete(id);
    });

    const store = createToolcraftStore({ schema: appSchema });
    const playheadPublications: number[] = [];
    const unsubscribe = store.jotai.sub(store.atoms.playhead, () => {
      playheadPublications.push(store.jotai.get(store.atoms.playhead));
    });
    const setPlayhead = vi.spyOn(store, "setPlayhead");
    const setIsPlaying = vi.fn() as unknown as React.Dispatch<React.SetStateAction<boolean>>;
    let renderCount = 0;

    function TimelineProbe({ timelineStore }: { timelineStore: ToolcraftStore }): React.JSX.Element {
      const playhead = useToolcraftPlayhead();
      renderCount += 1;

      useTimelineClock({
        durationSeconds: 10,
        isLooping: false,
        isPlaying: true,
        isScrubbing: false,
        setIsPlaying,
        store: timelineStore,
      });

      return <output data-testid="visible-playhead">{playhead.toFixed(3)}</output>;
    }

    const { getByTestId, unmount } = render(
      <ToolcraftStoreProvider store={store}>
        <TimelineProbe timelineStore={store} />
      </ToolcraftStoreProvider>,
    );

    const frameDurationMs = 1_000 / 60;
    const frameCount = 54;

    for (let frame = 1; frame <= frameCount; frame += 1) {
      currentTimestamp = frame * frameDurationMs;
      const animationFrame = animationFrames.values().next().value as
        | FrameRequestCallback
        | undefined;

      if (!animationFrame) {
        throw new Error("The timeline clock did not schedule its RAF callback.");
      }

      act(() => {
        // Advance browser timers before this frame, matching the browser ordering
        // where the previous UI publication can run before the next RAF callback.
        vi.advanceTimersByTime(frameDurationMs);
        animationFrame(currentTimestamp);
      });
    }

    const visiblePlayhead = Number(getByTestId("visible-playhead").textContent);
    const simulatedDurationSeconds = (frameCount * frameDurationMs) / 1_000;

    expect(setPlayhead).toHaveBeenCalledTimes(frameCount);
    expect(visiblePlayhead).toBeGreaterThan(0);
    expect(visiblePlayhead).toBeGreaterThan(0.8);
    expect(playheadPublications.length).toBeGreaterThan(0);
    expect(playheadPublications.length).toBeLessThanOrEqual(
      Math.ceil(simulatedDurationSeconds * 30),
    );
    expect(playheadPublications.length).toBeGreaterThanOrEqual(
      Math.floor(simulatedDurationSeconds * 29),
    );
    expect(playheadPublications.length / simulatedDurationSeconds).toBeLessThanOrEqual(30);
    expect(renderCount).toBeGreaterThanOrEqual(playheadPublications.length + 1);
    expect(renderCount).toBeLessThanOrEqual(playheadPublications.length + 2);

    unsubscribe();
    unmount();
    store.dispose();
  });

  it("starts the shared clock from the real timeline play button", async () => {
    let currentTimestamp = 0;
    vi.spyOn(window.performance, "now").mockImplementation(() => currentTimestamp);

    let nextAnimationFrameId = 0;
    const animationFrames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback): number => {
      const id = ++nextAnimationFrameId;
      animationFrames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number): void => {
      animationFrames.delete(id);
    });

    const store = createToolcraftStore({
      initialState: { timeline: { isPlaying: false } },
      schema: asciiLabSchema,
    });
    const view = render(
      <ToolcraftStoreProvider store={store}>
        <ToolcraftPlaybackClock />
        <TimelinePanel panelPlacement="floating" variant="compact" />
      </ToolcraftStoreProvider>,
    );

    fireEvent.click(await view.findByRole("button", { name: "Play playback" }));
    expect(store.getState().timeline.isPlaying).toBe(true);

    currentTimestamp = 1_000;
    act(() => {
      for (const [id, animationFrame] of [...animationFrames]) {
        animationFrames.delete(id);
        animationFrame(currentTimestamp);
      }
    });

    expect(store.getPlayhead()).toBeGreaterThan(0);
    const playheadWhilePlaying = store.getPlayhead();
    fireEvent.click(view.getByRole("button", { name: "Pause playback" }));
    expect(store.getState().timeline.isPlaying).toBe(false);

    currentTimestamp = 2_000;
    act(() => {
      for (const [id, animationFrame] of [...animationFrames]) {
        animationFrames.delete(id);
        animationFrame(currentTimestamp);
      }
    });
    expect(store.getPlayhead()).toBe(playheadWhilePlaying);

    view.unmount();
    store.dispose();
  });
});
