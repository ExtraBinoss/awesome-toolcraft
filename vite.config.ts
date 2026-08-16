import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
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
      "@base-ui/react/button",
      "@base-ui/react/checkbox",
      "@base-ui/react/input",
      "@base-ui/react/merge-props",
      "@base-ui/react/popover",
      "@base-ui/react/select",
      "@base-ui/react/slider",
      "@base-ui/react/switch",
      "@base-ui/react/tooltip",
      "@base-ui/react/toggle",
      "@base-ui/react/toggle-group",
      "@base-ui/react/use-render",
      "@phosphor-icons/react",
      "jotai",
      "jotai/utils",
      "lucide-react",
      "motion/react",
    ],
  },
});
