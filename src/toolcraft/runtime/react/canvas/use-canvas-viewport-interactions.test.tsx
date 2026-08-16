import { fireEvent, render } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ToolcraftDispatch } from "../../state/store";
import { useCanvasViewportInteractions } from "./use-canvas-viewport-interactions";

function CanvasViewportProbe({ dispatch }: { dispatch: ToolcraftDispatch }): React.JSX.Element {
  const { viewportRef } = useCanvasViewportInteractions({
    dispatch,
    draggable: true,
    offset: { x: 0, y: 0 },
    zoom: 100,
  });

  return (
    <div data-slot="toolcraft-runtime-app">
      <div ref={viewportRef}>
        <div data-toolcraft-canvas-world="" />
      </div>
    </div>
  );
}

describe("useCanvasViewportInteractions", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("animates wheel zoom in RAF and commits one Jotai command after settling", () => {
    vi.useFakeTimers();
    const dispatch = vi.fn<ToolcraftDispatch>();
    const animationFrames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;

    vi.spyOn(window.performance, "now").mockReturnValue(0);
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      animationFrames.set(frameId, callback);
      return frameId;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn((frameId: number) => {
      animationFrames.delete(frameId);
    }));

    const { container } = render(<CanvasViewportProbe dispatch={dispatch} />);
    const viewport = container.querySelector<HTMLElement>("[data-toolcraft-canvas-world]")
      ?.parentElement;
    const world = container.querySelector<HTMLElement>("[data-toolcraft-canvas-world]");

    expect(viewport).not.toBeNull();
    expect(world).not.toBeNull();
    vi.spyOn(viewport!, "getBoundingClientRect").mockReturnValue({
      bottom: 600,
      height: 600,
      left: 0,
      right: 800,
      top: 0,
      width: 800,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });

    fireEvent.wheel(world!, {
      clientX: 400,
      clientY: 300,
      ctrlKey: true,
      deltaY: -80,
    });

    expect(dispatch).not.toHaveBeenCalled();
    const firstFrame = [...animationFrames.values()][0];
    animationFrames.clear();
    firstFrame?.(16);
    expect(world!.style.transform).not.toContain("scale(1)");

    vi.advanceTimersByTime(319);
    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "canvas.setViewport" }),
    );
  });
});
