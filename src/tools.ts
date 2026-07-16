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
    slug: "gradient-generator",
    name: "Gradient Generator",
    category: "Design",
    status: "Available",
    image: "/images/gradient-generator.webp",
    href: "/tools/gradient-generator",
  },
  {
    slug: "aurora-generator",
    name: "Aurora Generator",
    category: "Design",
    status: "Available",
    image: "/images/aurora-generator.webp",
    href: "/tools/aurora-generator",
  },
  {
    slug: "awesome-toolcraft2",
    name: "Awesome Toolcraft",
    category: "Creative",
    status: "Available",
    image: "/images/awesome-toolcraft2.webp",
    href: "/tools/awesome-toolcraft2",
  },
];
