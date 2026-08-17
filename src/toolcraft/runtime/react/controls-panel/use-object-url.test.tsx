import { render } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useObjectUrl } from "./use-object-url";

function Preview({ blob }: { blob: Blob }): React.JSX.Element {
  return <output>{useObjectUrl(blob)}</output>;
}

describe("useObjectUrl", () => {
  afterEach(() => vi.restoreAllMocks());

  it("revokes the previous URL on replacement and the current URL on unmount", () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:first")
      .mockReturnValueOnce("blob:second");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const first = new Blob(["first"]);
    const second = new Blob(["second"]);
    const view = render(<Preview blob={first} />);

    expect(view.getByText("blob:first")).toBeTruthy();
    view.rerender(<Preview blob={second} />);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:first");
    expect(view.getByText("blob:second")).toBeTruthy();
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:second");
    expect(createObjectURL).toHaveBeenCalledTimes(2);
  });

  it("shares a cached URL while the same blob has multiple consumers", () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:shared");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const blob = new Blob(["shared"]);
    const view = render(<><Preview blob={blob} /><Preview blob={blob} /></>);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
