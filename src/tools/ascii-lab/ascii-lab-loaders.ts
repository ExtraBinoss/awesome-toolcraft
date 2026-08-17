let asciiLabRendererModule: Promise<typeof import("./ascii-lab-runtime-renderer")> | undefined;

export function loadAsciiLabRenderer(): Promise<typeof import("./ascii-lab-runtime-renderer")> {
  asciiLabRendererModule ??= import("./ascii-lab-runtime-renderer").catch((error: unknown) => {
    asciiLabRendererModule = undefined;
    throw error;
  });
  return asciiLabRendererModule;
}

export function preloadAsciiLabRenderer(): Promise<void> {
  const modulePromise = loadAsciiLabRenderer();
  return modulePromise.then(() => undefined);
}
