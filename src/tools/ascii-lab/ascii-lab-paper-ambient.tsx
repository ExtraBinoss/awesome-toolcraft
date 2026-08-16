import { Dithering } from "@paper-design/shaders-react";

export function AsciiLabPaperAmbient({
  background,
  foreground,
  speed,
}: {
  background: string;
  foreground: string;
  speed: number;
}): React.JSX.Element {
  return (
    <Dithering
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-35"
      colorBack={background}
      colorFront={foreground}
      fit="cover"
      shape="wave"
      size={5}
      speed={speed}
      type="4x4"
    />
  );
}
