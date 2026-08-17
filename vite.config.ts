import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? "/awesome-toolcraft/" : "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5000,
    cors: true,
  },
  optimizeDeps: {
    include: [
      "@base-ui/react/popover",
      "@base-ui/react/select",
      "@base-ui/react/slider",
      "@phosphor-icons/react",
      "jotai",
      "motion/react",
    ],
  },
});
