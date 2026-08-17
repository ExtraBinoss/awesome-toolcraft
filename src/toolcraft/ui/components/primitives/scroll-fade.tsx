"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useResolvedScrollFadeDisplayState } from "./scroll-fade-logic";
import { ScrollFadeViewport, useScrollFadeViewportAttachment } from "./scroll-fade-render";
import type { ScrollFadeProps } from "./scroll-fade-types";

function getPlainText(children: React.ReactNode): string | null {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) {
    const parts = children.map(getPlainText);
    return parts.some((part) => part === null) ? null : parts.join("");
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return getPlainText(children.props.children);
  }
  return children == null || typeof children === "boolean" ? "" : null;
}

function ObservedScrollFade({
  children,
  className,
  containerClassName,
  containerRef,
  disableTransition = false,
  dismissOnFirstInteraction = false,
  forceVisible = false,
  height,
  intensity,
  interactionWatch = [],
  preset,
  side = "bottom",
  showOppositeSide = false,
  style,
  visibilityMode = "overflow",
  viewportRef,
  watch = [],
  ...props
}: ScrollFadeProps): React.JSX.Element {
  const [viewportElement, setViewportElement] = React.useState<HTMLDivElement | null>(null);
  const attachViewport = useScrollFadeViewportAttachment({
    setViewportElement,
    viewportRef,
  });
  const { isHorizontal, rootStyle, viewportStyle, viewportVisible } =
    useResolvedScrollFadeDisplayState({
      disableTransition,
      dismissOnFirstInteraction,
      forceVisible,
      height,
      intensity,
      interactionWatch,
      preset,
      showOppositeSide,
      side,
      style,
      visibilityMode,
      viewportElement,
      watch,
    });

  return (
    <div
      className={cn("relative", containerClassName)}
      data-slot="scroll-fade"
      ref={containerRef}
      style={rootStyle}
    >
      <ScrollFadeViewport
        attachViewport={attachViewport}
        className={className}
        isHorizontal={isHorizontal}
        props={props}
        side={side}
        viewportStyle={viewportStyle}
        viewportVisible={viewportVisible}
      >
        {children}
      </ScrollFadeViewport>
    </div>
  );
}

export function ScrollFade(props: ScrollFadeProps): React.JSX.Element {
  const text = getPlainText(props.children);
  const side = props.side ?? "bottom";
  const isShortHorizontalLabel =
    (side === "left" || side === "right") &&
    text !== null &&
    text.trim().length <= 28 &&
    !props.forceVisible &&
    !props.showOppositeSide;

  if (!isShortHorizontalLabel) return <ObservedScrollFade {...props} />;

  const {
    children,
    className,
    containerClassName,
    containerRef,
    viewportRef,
    style,
    ...viewportProps
  } = props;
  delete viewportProps.disableTransition;
  delete viewportProps.dismissOnFirstInteraction;
  delete viewportProps.forceVisible;
  delete viewportProps.height;
  delete viewportProps.intensity;
  delete viewportProps.interactionWatch;
  delete viewportProps.preset;
  delete viewportProps.showOppositeSide;
  delete viewportProps.side;
  delete viewportProps.visibilityMode;
  delete viewportProps.watch;

  return (
    <div className={cn("relative", containerClassName)} data-slot="scroll-fade" ref={containerRef}>
      <div
        {...viewportProps}
        className={cn("overflow-x-auto overflow-y-hidden overscroll-contain", className)}
        data-scroll-fade-viewport=""
        data-side={side}
        data-slot="scroll-fade-viewport"
        data-visible="false"
        ref={viewportRef}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
