import { cva } from "class-variance-authority";

export const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-[color:var(--muted-foreground)] group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      size: {
        default: "group-data-horizontal/tabs:h-8",
        header: "group-data-horizontal/tabs:h-10",
        "header-lg": "group-data-horizontal/tabs:h-10",
      },
      variant: {
        default: "bg-transparent",
        line: "gap-1 bg-transparent pl-0",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  },
);
