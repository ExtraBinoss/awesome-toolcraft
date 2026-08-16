"use client";

import * as React from "react";
import { useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";

import {
  evaluateToolcraftTimelineValue,
  evaluateToolcraftTimelineValues,
} from "../../state/keyframe-evaluation";
import type { ToolcraftState } from "../../state/types";
import type { ToolcraftDispatch, ToolcraftStore } from "../../state/store";
import { useToolcraftStoreIdentity } from "./toolcraft-store-provider";

export function useToolcraftStore(): ToolcraftStore {
  return useToolcraftStoreIdentity();
}

export function useToolcraftDispatch(): ToolcraftDispatch {
  return useToolcraftStore().dispatch;
}

export function useToolcraftSelector<Value>(
  selector: (state: ToolcraftState) => Value,
  equalityFn: (left: Value, right: Value) => boolean = Object.is,
): Value {
  const store = useToolcraftStore();
  const selectedAtom = React.useMemo(
    () => selectAtom(store.atoms.state, selector, equalityFn),
    [equalityFn, selector, store],
  );

  return useAtomValue(selectedAtom, { store: store.jotai });
}

export function useToolcraftValue(target: string): unknown {
  const store = useToolcraftStore();
  return useAtomValue(store.atoms.value(target), { store: store.jotai });
}

export function useToolcraftValues(targets: readonly string[]): Record<string, unknown> {
  const store = useToolcraftStore();
  const targetsKey = JSON.stringify(targets);
  const targetsAtom = React.useMemo(
    () => store.atoms.values(targets),
    // The serialized target list intentionally defines subscription identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, targetsKey],
  );

  return useAtomValue(targetsAtom, { store: store.jotai });
}

export function useToolcraftPlayhead(): number {
  const store = useToolcraftStore();
  return useAtomValue(store.atoms.playhead, { store: store.jotai });
}

export function useToolcraftEvaluatedValues(
  timeSeconds?: number,
): Record<string, unknown> {
  const store = useToolcraftStore();
  const state = useAtomValue(store.atoms.state, { store: store.jotai });
  const playhead = useToolcraftPlayhead();
  const resolvedTime = timeSeconds ?? playhead;

  return React.useMemo(
    () => evaluateToolcraftTimelineValues(state, resolvedTime),
    [resolvedTime, state],
  );
}

export function useToolcraftEvaluatedValue(
  target: string,
  timeSeconds?: number,
): unknown {
  const store = useToolcraftStore();
  const value = useToolcraftValue(target);
  const keyframeGroups = useToolcraftSelector(
    React.useCallback((state) => state.timeline.keyframeGroups, []),
  );
  const playhead = useToolcraftPlayhead();
  const resolvedTime = timeSeconds ?? playhead;

  return React.useMemo(() => {
    const state = store.getState();
    return evaluateToolcraftTimelineValue(
      { ...state, timeline: { ...state.timeline, keyframeGroups }, values: { ...state.values, [target]: value } },
      target,
      resolvedTime,
    );
  }, [keyframeGroups, resolvedTime, store, target, value]);
}

// Keep the singular hook in the public runtime API even when an application
// only consumes the batched evaluator.
void useToolcraftEvaluatedValue;
