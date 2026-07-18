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
