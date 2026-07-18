"use client";

import * as React from "react";

type ControlsPanelVirtualContentProps = {
  children: React.ReactNode;
  viewportElement: HTMLDivElement | null;
};

const overscanViewportMultiplier = 1;

export function ControlsPanelVirtualContent({
  children,
}: ControlsPanelVirtualContentProps): React.JSX.Element {
  return <div className="w-full">{children}</div>;
}
