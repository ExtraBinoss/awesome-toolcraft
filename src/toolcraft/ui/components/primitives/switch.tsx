"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type SwitchProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "defaultValue" | "onChange" | "value"
> & {
  checked?: boolean;
  checkedThumbSide?: "start" | "end";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "xs" | "sm" | "default";
};

function Switch({
  className,
  checked,
  checkedThumbSide = "end",
  defaultChecked = false,
  disabled,
  onCheckedChange,
  onClick,
  size = "default",
  ...props
}: SwitchProps): React.JSX.Element {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
  const isChecked = checked ?? uncontrolledChecked;

  return (
    <button
      aria-checked={isChecked}
      disabled={disabled}
      data-checked-thumb-side={checkedThumbSide}
      data-checked={isChecked ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-slot="switch"
      data-size={size}
      data-unchecked={isChecked ? undefined : ""}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-px transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 aria-invalid:ring aria-invalid:ring-[color:color-mix(in_oklab,var(--destructive)_20%,transparent)] data-[size=default]:h-4 data-[size=default]:w-[28px] data-[size=sm]:h-3.5 data-[size=sm]:w-[24px] data-[size=xs]:h-3 data-[size=xs]:w-5 dark:aria-invalid:ring-[color:color-mix(in_oklab,var(--destructive)_40%,transparent)] data-checked:bg-[color:var(--accent)] data-unchecked:bg-[color:color-mix(in_oklab,var(--input)_20%,transparent)] data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const nextChecked = !isChecked;
        if (checked === undefined) setUncontrolledChecked(nextChecked);
        onCheckedChange?.(nextChecked);
      }}
      role="switch"
      type="button"
      {...props}
    >
      <span
        data-checked={isChecked ? "" : undefined}
        data-slot="switch-thumb"
        data-unchecked={isChecked ? undefined : ""}
        className="pointer-events-none block rounded-full bg-[color:var(--background)] ring-0 transition-transform group-data-[size=default]/switch:size-3.5 group-data-[size=sm]/switch:size-3 group-data-[size=xs]/switch:size-2.5 group-data-[checked-thumb-side=end]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[checked-thumb-side=end]/switch:data-unchecked:translate-x-0 group-data-[checked-thumb-side=start]/switch:data-checked:translate-x-0 group-data-[checked-thumb-side=start]/switch:data-unchecked:translate-x-[calc(100%-2px)] dark:bg-[color:var(--foreground)]"
      />
    </button>
  );
}

export { Switch };
