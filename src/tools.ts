export type ToolEntry = {
  slug: string;
  name: string;
  category: string;
  status: "Available" | "Coming soon";
  image: string;
  href: string;
};

// Add future tools here. Images must use AVIF or WebP.
export const tools: ToolEntry[] = [
  {
    slug: "ascii-lab",
    name: "ASCII Lab",
    category: "ASCII / Image / 3D",
    status: "Available",
    image: "/tool-images/suminagashi.avif",
    href: "/tools/ascii-lab",
  },
  {
    slug: "dither-heatmap",
    name: "Dither / Heatmap",
    category: "Image / Video",
    status: "Available",
    image: "/tool-images/suminagashi.avif",
    href: "/tools/dither-heatmap",
  },
  {
    slug: "artistic-3d",
    name: "Artistic 3D",
    category: "3D / Shaders",
    status: "Available",
    image: "/tool-images/gradient-generator.jpg",
    href: "/tools/artistic-3d",
  },
  {
    slug: "blob-tracking",
    name: "Blob Tracking",
    category: "Interactive",
    status: "Available",
    image: "/tool-images/blob-tracking-butterfly.avif",
    href: "/tools/blob-tracking",
  },
  {
    slug: "gradient-generator",
    name: "Gradient Generator",
    category: "Design",
    status: "Available",
    image: "/tool-images/gradient-generator.jpg",
    href: "/tools/gradient-generator",
  },
  {
    slug: "suminagashi",
    name: "Suminagashi Marbling",
    category: "Generative",
    status: "Available",
    image: "/tool-images/suminagashi.avif",
    href: "/tools/suminagashi",
  },
];
