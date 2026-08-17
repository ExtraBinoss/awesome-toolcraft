import { withBasePath } from "./base-path";

export type ToolEntry = {
  slug: string;
  name: string;
  category: string;
  status: "Available" | "Coming soon";
  image: string;
  href: string;
};

// Add future tools here. Paths are served from public/tool-images.
export const tools: ToolEntry[] = [
  {
    slug: "ascii-lab",
    name: "ASCII Lab",
    category: "ASCII / Image / 3D",
    status: "Available",
    image: withBasePath("/tool-images/ascii-lab.png"),
    href: withBasePath("/tools/ascii-lab"),
  },
  {
    slug: "dither-heatmap",
    name: "Dither / Heatmap",
    category: "Image / Video",
    status: "Available",
    image: withBasePath("/tool-images/dither-heatmap.png"),
    href: withBasePath("/tools/dither-heatmap"),
  },
  {
    slug: "artistic-3d",
    name: "Artistic 3D",
    category: "3D / Shaders",
    status: "Available",
    image: withBasePath("/tool-images/artistic-3d.png"),
    href: withBasePath("/tools/artistic-3d"),
  },
  {
    slug: "blob-tracking",
    name: "Blob Tracking",
    category: "Interactive",
    status: "Available",
    image: withBasePath("/tool-images/blob-tracking-butterfly.avif"),
    href: withBasePath("/tools/blob-tracking"),
  },
  {
    slug: "gradient-generator",
    name: "Gradient Generator",
    category: "Design",
    status: "Available",
    image: withBasePath("/tool-images/gradient-generator.jpg"),
    href: withBasePath("/tools/gradient-generator"),
  },
  {
    slug: "suminagashi",
    name: "Suminagashi Marbling",
    category: "Generative",
    status: "Available",
    image: withBasePath("/tool-images/suminagashi.avif"),
    href: withBasePath("/tools/suminagashi"),
  },
];
