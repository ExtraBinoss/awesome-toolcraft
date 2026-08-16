async function bootstrap(): Promise<void> {
  const reactScanEnabled =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("react-scan") === "1";

  if (reactScanEnabled) {
    const { scan } = await import("react-scan");
    scan({
      animationSpeed: "off",
      enabled: true,
      log: false,
      showToolbar: true,
      trackUnnecessaryRenders: true,
    });
  }

  const { mountToolcraftApp } = await import("./mount-app");
  mountToolcraftApp();
}

void bootstrap();
