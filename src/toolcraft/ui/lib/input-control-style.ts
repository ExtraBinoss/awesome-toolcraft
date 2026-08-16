type SharedInputControlSize = "sm" | "default" | "lg" | "xl";

export const SHARED_INPUT_CONTROL_SURFACE_CLASS_NAME =
  "border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] bg-[color:color-mix(in_oklab,var(--input)_5%,transparent)] bg-clip-padding text-[color:var(--foreground)]";

export const SHARED_INPUT_CONTROL_BASE_CLASS_NAME = [
  "w-full min-w-0 cursor-text rounded-lg border transition-colors outline-none",
  "file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-[color:var(--foreground)]",
  "placeholder:text-[color:var(--muted-foreground)]",
  "[&:not(:focus):hover]:!border-[color:color-mix(in_oklab,var(--border)_20%,transparent)] [&:not(:focus):hover]:text-[color:var(--foreground)]",
  "focus:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)]",
  "focus-visible:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-[color:var(--destructive)]",
  "dark:aria-invalid:border-[color:color-mix(in_oklab,var(--destructive)_50%,transparent)]",
  SHARED_INPUT_CONTROL_SURFACE_CLASS_NAME,
].join(" ");

export const SHARED_INPUT_CONTROL_SIZE_CLASS_NAMES = {
  default: "h-7 px-2 py-0.5 text-xs/relaxed file:h-6 file:text-xs/relaxed",
  lg: "h-8 px-2.5 py-1 text-sm/relaxed file:h-7 file:text-sm/relaxed",
  sm: "h-6 px-2 py-0 text-xs/relaxed file:h-5 file:text-xs/relaxed",
  xl: "h-10 px-3 py-1.5 text-base/relaxed file:h-9 file:text-base/relaxed",
} as const satisfies Record<SharedInputControlSize, string>;
