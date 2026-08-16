import { cva } from "class-variance-authority";

export const navigationMenuInteractiveItemStyle =
  "cursor-pointer bg-transparent text-[color:var(--foreground)] transition-all outline-none hover:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] hover:text-[color:var(--foreground)] focus:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] focus:text-[color:var(--foreground)] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--ring)_30%,transparent)] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50";

export const navigationMenuTriggerStyle = cva(
  `${navigationMenuInteractiveItemStyle} group/navigation-menu-trigger inline-flex h-8 w-max items-center justify-center rounded-md px-2.5 py-1.5 text-xs/relaxed font-medium data-popup-open:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] data-popup-open:text-[color:var(--foreground)] data-open:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] data-open:text-[color:var(--foreground)]`,
);

export const navigationMenuLinkStyle = cva(
  `${navigationMenuInteractiveItemStyle} flex items-center gap-1.5 rounded-lg p-2 popup-text-xs-plus leading-relaxed data-[active=true]:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] data-[active=true]:hover:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] data-[active=true]:focus:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] [&_svg:not([class*='size-'])]:size-4`,
);
