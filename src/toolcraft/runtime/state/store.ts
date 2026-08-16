import { atom, createStore, type Atom, type WritableAtom } from "jotai/vanilla";

import type { ResolvedToolcraftAppSchema } from "../schema/types";
import { createToolcraftState } from "./create-template-state";
import {
  evaluateToolcraftTimelineValue,
  evaluateToolcraftTimelineValues,
} from "./keyframe-evaluation";
import { toolcraftReducer } from "./reducer";
import type {
  ToolcraftCommand,
  ToolcraftInitialState,
  ToolcraftState,
} from "./types";

export type ToolcraftDispatch = (
  command: ToolcraftCommand | readonly ToolcraftCommand[],
) => void;

export type ToolcraftStoreAtoms = {
  canvas: Atom<ToolcraftState["canvas"]>;
  history: Atom<ToolcraftState["history"]>;
  layers: Atom<ToolcraftState["layers"]>;
  media: Atom<ToolcraftState["mediaAssets"]>;
  panels: Atom<ToolcraftState["panels"]>;
  playhead: Atom<number>;
  schema: Atom<ToolcraftState["schema"]>;
  selectedLayerId: Atom<ToolcraftState["selectedLayerId"]>;
  state: Atom<ToolcraftState>;
  timeline: Atom<ToolcraftState["timeline"]>;
  value: (target: string) => Atom<unknown>;
  values: (targets: readonly string[]) => Atom<Record<string, unknown>>;
};

export type ToolcraftStore = {
  atoms: ToolcraftStoreAtoms;
  dispatch: ToolcraftDispatch;
  dispatchMany: (commands: readonly ToolcraftCommand[]) => void;
  dispose: () => void;
  getEvaluatedValue: (target: string, timeSeconds?: number) => unknown;
  getEvaluatedValues: (
    targets?: readonly string[],
    timeSeconds?: number,
  ) => Record<string, unknown>;
  getPlayhead: () => number;
  getState: () => ToolcraftState;
  jotai: ReturnType<typeof createStore>;
  setPlayhead: (timeSeconds: number, uiTimestamp?: number) => void;
  subscribe: (listener: () => void) => () => void;
  syncPlayhead: () => void;
};

export type CreateToolcraftStoreOptions = {
  initialState?: ToolcraftInitialState;
  schema: ResolvedToolcraftAppSchema;
};

const playheadUiIntervalMs = 1_000 / 30;
const playheadUiFrameToleranceMs = 0.5;

export function createToolcraftStore({
  initialState,
  schema,
}: CreateToolcraftStoreOptions): ToolcraftStore {
  const jotai = createStore();
  const initialCommittedState = createToolcraftState(schema, initialState);
  const committedStateAtom = atom(initialCommittedState);
  const transientPlayheadAtom = atom(initialCommittedState.timeline.currentTimeSeconds);
  const playheadAtom = atom(initialCommittedState.timeline.currentTimeSeconds);
  const dispatchAtom: WritableAtom<null, [ToolcraftCommand | readonly ToolcraftCommand[]], void> =
    atom(null, (get, set, input) => {
      const commands: readonly ToolcraftCommand[] = Array.isArray(input)
        ? (input as readonly ToolcraftCommand[])
        : [input as ToolcraftCommand];
      let nextState = get(committedStateAtom);

      for (const command of commands) {
        nextState = toolcraftReducer(nextState, command);
      }

      if (nextState !== get(committedStateAtom)) {
        set(committedStateAtom, nextState);
      }
    });
  const valueAtoms = new Map<string, Atom<unknown>>();
  const valuesAtoms = new Map<string, Atom<Record<string, unknown>>>();
  let lastPlayheadUiPublish = 0;
  let lastLoggedPlayheadSecond = -1;

  const getValueAtom = (target: string): Atom<unknown> => {
    let targetAtom = valueAtoms.get(target);

    if (!targetAtom) {
      targetAtom = atom((get) => get(committedStateAtom).values[target]);
      valueAtoms.set(target, targetAtom);
    }

    return targetAtom;
  };
  const getValuesAtom = (targets: readonly string[]): Atom<Record<string, unknown>> => {
    const uniqueTargets = [...new Set(targets)];
    const key = JSON.stringify(uniqueTargets);
    let targetsAtom = valuesAtoms.get(key);

    if (!targetsAtom) {
      targetsAtom = atom((get) =>
        Object.fromEntries(uniqueTargets.map((target) => [target, get(getValueAtom(target))])),
      );
      valuesAtoms.set(key, targetsAtom);
    }

    return targetsAtom;
  };
  const setPlayhead = (
    timeSeconds: number,
    uiTimestamp = performance.now(),
  ): void => {
    jotai.set(transientPlayheadAtom, timeSeconds);
    const currentLoggedSecond = Math.floor(timeSeconds);

    if (
      import.meta.env.DEV &&
      import.meta.env.MODE !== "test" &&
      currentLoggedSecond !== lastLoggedPlayheadSecond
    ) {
      lastLoggedPlayheadSecond = currentLoggedSecond;
      console.info("[Toolcraft timeline] Jotai playhead write", {
        timeSeconds,
        uiTimestamp,
      });
    }
    const elapsed = uiTimestamp - lastPlayheadUiPublish;

    // RAF timestamps commonly land a fraction below the theoretical 30 Hz
    // boundary. A sub-millisecond tolerance prevents those frames from being
    // skipped until the following RAF (which would visibly reduce the UI to
    // roughly 20 Hz on a 60 Hz display).
    if (elapsed >= playheadUiIntervalMs - playheadUiFrameToleranceMs) {
      lastPlayheadUiPublish = uiTimestamp;
      jotai.set(playheadAtom, timeSeconds);
    }
  };
  const syncPlayhead = (): void => {
    const timeSeconds = jotai.get(transientPlayheadAtom);
    const state = jotai.get(committedStateAtom);

    if (state.timeline.currentTimeSeconds !== timeSeconds) {
      jotai.set(dispatchAtom, {
        currentTimeSeconds: timeSeconds,
        type: "timeline.setCurrentTime",
      });
    }
    jotai.set(playheadAtom, timeSeconds);
  };
  const dispatch: ToolcraftDispatch = (input) => {
    const commands: readonly ToolcraftCommand[] = Array.isArray(input)
      ? (input as readonly ToolcraftCommand[])
      : [input as ToolcraftCommand];
    let explicitPlayhead: ToolcraftCommand | undefined;

    for (let index = commands.length - 1; index >= 0; index -= 1) {
      if (commands[index]?.type === "timeline.setCurrentTime") {
        explicitPlayhead = commands[index];
        break;
      }
    }

    if (explicitPlayhead?.type === "timeline.setCurrentTime") {
      jotai.set(transientPlayheadAtom, explicitPlayhead.currentTimeSeconds);
      jotai.set(playheadAtom, explicitPlayhead.currentTimeSeconds);
    } else if (commands.some((command) => command.type !== "timeline.setPlaying")) {
      syncPlayhead();
    }

    jotai.set(dispatchAtom, input);

    if (
      commands.some(
        (command) =>
          (command.type === "timeline.setPlaying" && !command.isPlaying) ||
          command.type === "timeline.togglePlayback",
      )
    ) {
      syncPlayhead();
    }
  };

  const stateAtom = atom((get) => get(committedStateAtom));
  const atoms: ToolcraftStoreAtoms = {
    canvas: atom((get) => get(committedStateAtom).canvas),
    history: atom((get) => get(committedStateAtom).history),
    layers: atom((get) => get(committedStateAtom).layers),
    media: atom((get) => get(committedStateAtom).mediaAssets),
    panels: atom((get) => get(committedStateAtom).panels),
    playhead: playheadAtom,
    schema: atom((get) => get(committedStateAtom).schema),
    selectedLayerId: atom((get) => get(committedStateAtom).selectedLayerId),
    state: stateAtom,
    timeline: atom((get) => get(committedStateAtom).timeline),
    value: getValueAtom,
    values: getValuesAtom,
  };

  return {
    atoms,
    dispatch,
    dispatchMany: (commands) => dispatch(commands),
    // The store owns no external resource. Keeping disposal idempotent and
    // non-destructive is required because React Strict Mode replays effect
    // cleanup while preserving the same store instance in development.
    dispose: () => undefined,
    getEvaluatedValue: (target, timeSeconds = jotai.get(transientPlayheadAtom)) =>
      evaluateToolcraftTimelineValue(jotai.get(committedStateAtom), target, timeSeconds),
    getEvaluatedValues: (targets, timeSeconds = jotai.get(transientPlayheadAtom)) => {
      const values = evaluateToolcraftTimelineValues(
        jotai.get(committedStateAtom),
        timeSeconds,
      );

      return targets
        ? Object.fromEntries(targets.map((target) => [target, values[target]]))
        : values;
    },
    getPlayhead: () => jotai.get(transientPlayheadAtom),
    getState: () => jotai.get(committedStateAtom),
    jotai,
    setPlayhead,
    subscribe: (listener) => jotai.sub(committedStateAtom, listener),
    syncPlayhead,
  };
}
