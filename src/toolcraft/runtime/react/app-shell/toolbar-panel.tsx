"use client";

import * as React from "react";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  CrosshairIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MoonIcon,
  SunIcon,
} from "@phosphor-icons/react";

import type { ToolcraftPanelState } from "../../state/types";
import type { PanelPlacement, PanelStateChange } from "../panel-host/panel-host-types";
import { useToolcraftTheme } from "./theme-runtime";
import { useToolcraftDispatch, useToolcraftSelector } from "./use-toolcraft";
import { ToolbarPanelFrame } from "./toolbar-panel-frame";

export type ToolbarPanelProps = {
  className?: string;
  framed?: boolean;
  onPanelStateChange?: PanelStateChange;
  panelPlacement?: PanelPlacement;
  panelState?: ToolcraftPanelState;
};

type ToolbarIconButtonProps = {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
};

const desktopToolbarTightButtonGapClassName = "-mr-px";

function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function ToolbarDivider(): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="block h-5 w-px shrink-0 rounded-full bg-[color:color-mix(in_oklab,var(--border)_8%,transparent)]"
      data-slot="desktop-toolbar-divider"
    />
  );
}

function ToolbarIconButton({
  active = false,
  children,
  className,
  disabled,
  label,
  onClick,
}: ToolbarIconButtonProps): React.JSX.Element {
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.();

    if (typeof event.currentTarget.blur === "function") {
      event.currentTarget.blur();
    }
  };

  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--accent)] hover:text-[color:var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--ring)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
        active && "text-[color:var(--foreground)]",
        className,
      )}
      disabled={disabled}
      onClick={handleClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function ToolbarPanel({
  className,
  framed = true,
  onPanelStateChange,
  panelPlacement,
  panelState,
}: ToolbarPanelProps): React.JSX.Element {
  const dispatch = useToolcraftDispatch();
  const toolbar = useToolcraftSelector(React.useCallback((state) => state.schema.toolbar, []));
  const history = useToolcraftSelector(React.useCallback((state) => state.history, []));
  const zoom = useToolcraftSelector(React.useCallback((state) => state.canvas.zoom, []));
  const { resolvedTheme, toggleResolvedTheme } = useToolcraftTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const canUndo = history.undo.length > 0;
  const canRedo = history.redo.length > 0;
  const back = toolbar.back;
  const historyEnabled = toolbar.history;
  const radarEnabled = toolbar.radar;
  const themeEnabled = toolbar.theme;
  const zoomEnabled = toolbar.zoom;

  const toolbarSurface = (
    <div
      className={cn(
        "floating-popup-surface toolcraft-panel-surface pointer-events-auto flex w-auto items-center justify-start gap-1.5 rounded-lg border p-1 text-[color:var(--popover-foreground)] supports-backdrop-filter:backdrop-blur-2xl supports-backdrop-filter:backdrop-saturate-150",
        !framed && className,
      )}
      data-toolcraft-inspect-toolbar="true"
      data-panel-id="toolbar"
    >
      {back ? (
        <>
          <ToolbarIconButton
            label={back.label ?? "Back to tools"}
            onClick={() => window.location.assign(back.href)}
          >
            <ArrowLeftIcon />
          </ToolbarIconButton>
          <ToolbarDivider />
        </>
      ) : null}
      {historyEnabled ? (
        <>
          <ToolbarIconButton
            className={desktopToolbarTightButtonGapClassName}
            disabled={!canUndo}
            label="Undo"
            onClick={() => dispatch({ type: "history.undo" })}
          >
            <ArrowCounterClockwiseIcon />
          </ToolbarIconButton>
          <ToolbarIconButton
            className={desktopToolbarTightButtonGapClassName}
            disabled={!canRedo}
            label="Redo"
            onClick={() => dispatch({ type: "history.redo" })}
          >
            <ArrowClockwiseIcon />
          </ToolbarIconButton>
          <ToolbarDivider />
        </>
      ) : null}
      {zoomEnabled ? (
        <>
          <ToolbarIconButton
            label="Zoom out"
            onClick={() => dispatch({ type: "canvas.zoomOut" })}
          >
            <MagnifyingGlassMinusIcon />
          </ToolbarIconButton>
          <span
            className="inline-flex h-7 w-[4ch] shrink-0 cursor-default items-center justify-center font-mono text-[12px] leading-[1.125rem] text-[color:color-mix(in_oklab,var(--foreground)_90%,transparent)] tabular-nums select-none"
            data-panel-drag-ignore=""
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              dispatch({ type: "canvas.zoomReset" });
            }}
          >
            {zoom}%
          </span>
          <ToolbarIconButton
            label="Zoom in"
            onClick={() => dispatch({ type: "canvas.zoomIn" })}
          >
            <MagnifyingGlassPlusIcon />
          </ToolbarIconButton>
          <ToolbarDivider />
        </>
      ) : null}
      {themeEnabled ? (
        <ToolbarIconButton
          label={nextTheme === "light" ? "Light theme" : "Dark theme"}
          onClick={toggleResolvedTheme}
        >
          {nextTheme === "light" ? (
            <SunIcon data-icon="theme-light" />
          ) : (
            <MoonIcon data-icon="theme-dark" />
          )}
        </ToolbarIconButton>
      ) : null}
      {radarEnabled ? (
        <ToolbarIconButton
          label="Center canvas"
          onClick={() => dispatch({ type: "canvas.center" })}
        >
          <CrosshairIcon />
        </ToolbarIconButton>
      ) : null}
    </div>
  );

  return (
    <ToolbarPanelFrame
      onPanelStateChange={onPanelStateChange}
      panelState={panelState}
      placement={panelPlacement ?? (framed ? "frame" : "surface")}
    >
      {toolbarSurface}
    </ToolbarPanelFrame>
  );
}
