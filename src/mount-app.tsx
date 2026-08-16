import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { logToolLoad } from "./tool-load-debug";
import "./toolcraft-app.css";
import "./styles.css";

export function mountToolcraftApp(): void {
  logToolLoad("boot:main module evaluated");
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Toolcraft root element was not found.");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
