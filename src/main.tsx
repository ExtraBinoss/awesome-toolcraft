import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { logToolLoad } from "./tool-load-debug";
import "./toolcraft-app.css";
import "./styles.css";

logToolLoad("boot:main module evaluated");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
