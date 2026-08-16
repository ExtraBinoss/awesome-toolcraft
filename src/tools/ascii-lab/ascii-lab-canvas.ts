export function getAsciiLabCanvas(): HTMLCanvasElement | null {
  return document.querySelector<HTMLCanvasElement>(
    "[data-toolcraft-ascii-lab-canvas='true']",
  );
}
