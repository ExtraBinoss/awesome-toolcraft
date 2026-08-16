import type * as React from "react";

export const stopPanelHeaderButtonPointerDown: React.PointerEventHandler<
  HTMLButtonElement
> = (event) => {
  event.stopPropagation();
};
