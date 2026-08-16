import { render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";

import { appSchema } from "@/tools/ascii-lab/app-schema";
import { ToolcraftApp } from "../app-shell/toolcraft-app";

describe("ControlsPanel suspense isolation", () => {
  it("reveals the panel while a custom control is still loading", async () => {
    const PendingCustomControl = React.lazy(
      () => new Promise<never>(() => undefined),
    );

    render(
      <ToolcraftApp
        controlRenderers={{ asciiLabExport: PendingCustomControl }}
        renderDefaultCanvasMedia={false}
        schema={appSchema}
      />,
    );

    expect(
      await screen.findAllByText("ASCII language", undefined, { timeout: 15_000 }),
    ).not.toHaveLength(0);
  }, 20_000);
});
