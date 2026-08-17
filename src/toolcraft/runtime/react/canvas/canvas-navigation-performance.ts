let canvasNavigationActive = false;

export function isToolcraftCanvasNavigationActive(): boolean {
  return canvasNavigationActive;
}

export function setToolcraftCanvasNavigationActive(active: boolean): void {
  if (canvasNavigationActive === active) return;
  canvasNavigationActive = active;
  window.dispatchEvent(new CustomEvent("toolcraft:canvas-navigation", {
    detail: { active },
  }));
}
