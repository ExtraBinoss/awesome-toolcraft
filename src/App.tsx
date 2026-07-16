import { lazy, Suspense } from "react";

import { HubPage } from "./HubPage";

const GradientGeneratorPage = lazy(() =>
  import("./tools/gradient-generator/GradientGeneratorPage").then((module) => ({
    default: module.GradientGeneratorPage,
  })),
);
const AuroraGeneratorPage = lazy(() =>
  import("./tools/aurora-generator/AuroraGeneratorPage").then((module) => ({
    default: module.AuroraGeneratorPage,
  })),
);

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/tools/gradient-generator") {
    return (
      <Suspense fallback={<div className="route-loading">Loading Gradient Generator…</div>}>
        <GradientGeneratorPage />
      </Suspense>
    );
  }
  if (path === "/tools/aurora-generator") {
    return (
      <Suspense fallback={<div className="route-loading">Loading Aurora Generator…</div>}>
        <AuroraGeneratorPage />
      </Suspense>
    );
  }

  return <HubPage />;
}
