import { act, fireEvent, render } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ControlsPanelVirtualContent } from "./controls-panel-virtual-content";

describe("ControlsPanelVirtualContent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders one-section overscan and keeps the focused section mounted", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const id = ++frameId;
      frames.set(id, callback);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    });
    const viewport = document.createElement("div");
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(viewport, "scrollTop", { configurable: true, value: 0, writable: true });
    const view = render(
      <ControlsPanelVirtualContent viewportElement={viewport}>
        {Array.from({ length: 6 }, (_, index) => (
          <section key={index}><button>Section {index}</button></section>
        ))}
      </ControlsPanelVirtualContent>,
    );

    const focused = view.getByRole("button", { name: "Section 0" });
    focused.focus();
    viewport.scrollTop = 660;
    fireEvent.scroll(viewport);
    act(() => {
      for (const [id, callback] of [...frames]) {
        frames.delete(id);
        callback(16);
      }
    });

    expect(view.getByRole("button", { name: "Section 0" })).toBe(document.activeElement);
    expect(view.getByRole("button", { name: "Section 3" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Section 5" })).toBeNull();
  });
});
