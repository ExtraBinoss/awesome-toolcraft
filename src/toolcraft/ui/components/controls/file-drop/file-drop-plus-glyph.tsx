import { cn } from "../../../lib/utils";

export function FileDropPlusGlyph({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={cn("flex-none", className)}
      fill="none"
      viewBox="0 0 14 14"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7 2.5V11.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1" />
      <path d="M2.5 7H11.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1" />
    </svg>
  );
}
