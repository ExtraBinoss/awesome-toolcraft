import { render } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScrollFade } from "./scroll-fade";

describe("ScrollFade", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does not create observation state for short horizontal labels", () => {
    const observe = vi.fn();
    const constructorSpy = vi.fn();
    class ResizeObserverMock {
      constructor() { constructorSpy(); }
      disconnect = vi.fn();
      observe = observe;
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    render(<ScrollFade side="right"><span>Short label</span></ScrollFade>);
    expect(constructorSpy).not.toHaveBeenCalled();
  });

  it("uses one observer even when both fade edges are enabled", () => {
    const observe = vi.fn();
    const constructorSpy = vi.fn();
    class ResizeObserverMock {
      constructor() { constructorSpy(); }
      disconnect = vi.fn();
      observe = observe;
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    render(
      <ScrollFade showOppositeSide side="right">
        <span>This label is intentionally long enough to require overflow observation</span>
      </ScrollFade>,
    );
    expect(constructorSpy).toHaveBeenCalledTimes(1);
  });
});
