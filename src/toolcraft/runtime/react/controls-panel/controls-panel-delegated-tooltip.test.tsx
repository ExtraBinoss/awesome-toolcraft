import { fireEvent, render } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";

import { ControlsPanelDelegatedTooltip } from "./controls-panel-delegated-tooltip";

describe("ControlsPanelDelegatedTooltip", () => {
  it("serves pointer and keyboard triggers from one delegated tooltip", () => {
    const view = render(
      <ControlsPanelDelegatedTooltip>
        <button data-toolcraft-tooltip="Reset section">Reset</button>
        <button data-toolcraft-tooltip="Add keyframe">Keyframe</button>
      </ControlsPanelDelegatedTooltip>,
    );
    const reset = view.getByRole("button", { name: "Reset" });
    const keyframe = view.getByRole("button", { name: "Keyframe" });

    fireEvent.pointerOver(reset);
    expect(view.getByRole("tooltip").textContent).toBe("Reset section");
    expect(reset.getAttribute("aria-describedby")).toBe("toolcraft-controls-tooltip");

    fireEvent.pointerOut(reset, { relatedTarget: keyframe });
    fireEvent.focusIn(keyframe);
    expect(view.getByRole("tooltip").textContent).toBe("Add keyframe");
  });
});
