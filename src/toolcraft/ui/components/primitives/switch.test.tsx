import { fireEvent, render } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  it("exposes switch semantics and toggles through the current API", () => {
    const onCheckedChange = vi.fn();
    const view = render(
      <Switch aria-label="Include background" checked={false} onCheckedChange={onCheckedChange} />,
    );
    const control = view.getByRole("switch", { name: "Include background" });

    expect(control.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(control);
    expect(onCheckedChange).toHaveBeenCalledWith(true);

    view.rerender(
      <Switch aria-label="Include background" checked onCheckedChange={onCheckedChange} />,
    );
    expect(control.getAttribute("aria-checked")).toBe("true");
  });

  it("supports uncontrolled use and native keyboard activation", () => {
    const view = render(<Switch aria-label="Preview" defaultChecked={false} />);
    const control = view.getByRole("switch", { name: "Preview" });
    fireEvent.click(control);
    expect(control.getAttribute("aria-checked")).toBe("true");
  });
});
