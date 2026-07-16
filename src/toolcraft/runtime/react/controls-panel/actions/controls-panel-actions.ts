"use client";

import * as React from "react";

import type {
  ToolcraftActionCommand,
  ToolcraftActionSchema,
} from "../../../schema/types";
import type {
  ToolcraftCommand,
  ToolcraftState,
} from "../../../state/types";
import type { ActionControlRunAction } from "../renderers/controls-panel-action-renderer";

export type ToolcraftPanelActionContext = {
  action: ToolcraftActionSchema;
  dispatch: React.Dispatch<ToolcraftCommand>;
  reportProgress: (progress: number) => void;
  state: ToolcraftState;
};

export type ToolcraftPanelActionHandler = (
  context: ToolcraftPanelActionContext,
) => PromiseLike<unknown> | void;

type FooterActionProgressEntry = {
  id: number;
  progress: number | null;
};

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function noopReportProgress(): void {}

function clampFooterActionProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.max(0, Math.min(1, progress));
}

function getActionCommand(action: ToolcraftActionSchema): ToolcraftActionCommand | null {
  if (action.command) {
    return action.command;
  }

  switch (action.value.toLowerCase()) {
    case "apply":
      return "controls.apply";
    case "reset":
      return "controls.reset";
    default:
      return null;
  }
}

export function useControlsPanelActions({
  dispatch,
  onPanelAction,
  state,
}: {
  dispatch: React.Dispatch<ToolcraftCommand>;
  onPanelAction?: ToolcraftPanelActionHandler;
  state: ToolcraftState;
}): {
  runAction: ActionControlRunAction;
  stickyFooterActive: boolean;
  stickyFooterProgress: number | null;
} {
  const nextFooterActionIdRef = React.useRef(0);
  const [footerActionProgressEntries, setFooterActionProgressEntries] =
    React.useState<readonly FooterActionProgressEntry[]>([]);
  const stickyFooterProgress = React.useMemo(() => {
    for (let index = footerActionProgressEntries.length - 1; index >= 0; index -= 1) {
      const progress = footerActionProgressEntries[index]?.progress;

      if (typeof progress === "number") {
        return progress;
      }
    }

    return null;
  }, [footerActionProgressEntries]);

  function createFooterActionProgressTracker(): {
    reportProgress: (progress: number) => void;
    trackResult: (result: PromiseLike<unknown> | void) => void;
  } {
    const id = nextFooterActionIdRef.current;
    nextFooterActionIdRef.current += 1;

    let latestProgress: number | null = null;
    let isTracked = false;

    function reportProgress(progress: number): void {
      latestProgress = clampFooterActionProgress(progress);

      if (!isTracked) {
        return;
      }

      setFooterActionProgressEntries((entries) =>
        entries.map((entry) =>
          entry.id === id ? { ...entry, progress: latestProgress } : entry,
        ),
      );
    }

    function trackResult(result: PromiseLike<unknown> | void): void {
      if (!isPromiseLike(result)) {
        return;
      }

      isTracked = true;
      setFooterActionProgressEntries((entries) => [
        ...entries,
        { id, progress: latestProgress },
      ]);

      void Promise.resolve(result)
        .catch((error: unknown) => {
          console.error("Toolcraft panel action failed.", error);
        })
        .finally(() => {
          setFooterActionProgressEntries((entries) =>
            entries.filter((entry) => entry.id !== id),
          );
        });
    }

    return { reportProgress, trackResult };
  }

  function runAction(
    action: ToolcraftActionSchema,
    options: { trackFooterPending?: boolean } = {},
  ): void {
    const command = action.command ?? (onPanelAction ? null : getActionCommand(action));

    if (command) {
      dispatch({ type: command });
      return;
    }

    const footerActionProgressTracker = options.trackFooterPending
      ? createFooterActionProgressTracker()
      : null;
    const result = onPanelAction?.({
      action,
      dispatch,
      reportProgress:
        footerActionProgressTracker?.reportProgress ?? noopReportProgress,
      state,
    });

    footerActionProgressTracker?.trackResult(result);
  }

  return {
    runAction,
    stickyFooterActive: footerActionProgressEntries.length > 0,
    stickyFooterProgress,
  };
}
