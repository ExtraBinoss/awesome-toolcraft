import { cn } from "../../lib/utils";

const comboboxPopupSurfaceBaseClassName =
  "floating-popup-surface group/combobox-content relative overflow-hidden rounded-lg border p-1 popup-text-xs-plus text-[color:var(--popover-foreground)] [&>[data-slot=combobox-search]]:-mx-1 [&>[data-slot=combobox-search]]:-mt-1 [&>[data-slot=combobox-search]]:mb-0 [&>[data-slot=combobox-search]]:border-b [&>[data-slot=combobox-search]]:border-[color:color-mix(in_oklab,var(--border)_5%,transparent)] [&>[data-slot=combobox-search]]:pr-1 [&>[data-slot=combobox-search]]:pl-0 [&>[data-slot=combobox-search]]:pt-1 [&>[data-slot=combobox-search]]:pb-1 [&>[data-slot=combobox-search]>[data-slot=input-group]]:m-0 [&>[data-slot=combobox-search]>[data-slot=input-group]]:rounded-none [&>[data-slot=combobox-search]>[data-slot=input-group]]:border-none [&>[data-slot=combobox-search]>[data-slot=input-group]]:bg-transparent [&>[data-slot=combobox-search]>[data-slot=input-group]]:shadow-none";

export const comboboxPopupSurfaceClassName = cn(
  comboboxPopupSurfaceBaseClassName,
  "max-h-(--available-height) w-[min(var(--anchor-width),calc(var(--spacing)*64))] max-w-[min(var(--available-width),calc(var(--spacing)*64))] min-w-[min(calc(var(--anchor-width)+calc(var(--spacing)*7)),calc(var(--spacing)*64))] origin-(--transform-origin) duration-100 data-[chips=true]:min-w-[min(var(--anchor-width),calc(var(--spacing)*64))] data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
);
