import { act, render } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { appSchema } from "@/tools/gradient-generator/app-schema";
import { ToolcraftRoot } from "../react/app-shell/toolcraft-root";
import {
  useToolcraftDispatch,
  useToolcraftValue,
} from "../react/app-shell/use-toolcraft";
import { createToolcraftState } from "./create-template-state";
import { createToolcraftPersistenceSnapshot } from "./persistence";
import { toolcraftReducer } from "./reducer";
import { createToolcraftStore, type ToolcraftDispatch } from "./store";
import type { ToolcraftCommand } from "./types";

describe("createToolcraftStore", () => {
  it("isolates multiple stores", () => {
    const first = createToolcraftStore({ schema: appSchema });
    const second = createToolcraftStore({ schema: appSchema });

    first.dispatch({ target: "gradient.seed", type: "controls.setValue", value: 81 });

    expect(first.getState().values["gradient.seed"]).toBe(81);
    expect(second.getState().values["gradient.seed"]).toBe(37);
  });

  it("has reducer parity across command families", () => {
    const commands: ToolcraftCommand[] = [
      { target: "gradient.seed", type: "controls.setValue", value: 12 },
      { type: "canvas.zoomIn" },
      { layer: { name: "Generated" }, type: "layers.add" },
      { hidden: true, panelId: "controls", type: "panels.setHidden" },
      { durationSeconds: 8, type: "timeline.setDuration" },
    ];
    const initial = createToolcraftState(appSchema);
    const reduced = commands.reduce(toolcraftReducer, initial);
    const store = createToolcraftStore({ schema: appSchema });

    store.dispatch(commands);

    expect(store.getState()).toEqual(reduced);
  });

  it("publishes a command transaction once and preserves undo/redo", () => {
    const store = createToolcraftStore({ schema: appSchema });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.dispatch([
      { historyGroup: "randomize", target: "gradient.seed", type: "controls.setValue", value: 10 },
      { historyGroup: "randomize", target: "gradient.spread", type: "controls.setValue", value: 90 },
    ]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().history.undo).toHaveLength(2);
    store.dispatch({ type: "history.undo" });
    expect(store.getState().values["gradient.spread"]).toBe(68);
    store.dispatch({ type: "history.redo" });
    expect(store.getState().values["gradient.spread"]).toBe(90);
    unsubscribe();
  });

  it("keeps the transient playhead out of committed state until synchronization", () => {
    vi.useFakeTimers();
    const store = createToolcraftStore({ schema: appSchema });

    store.setPlayhead(3.25);
    expect(store.getPlayhead()).toBe(3.25);
    expect(store.getState().timeline.currentTimeSeconds).toBe(0);
    store.syncPlayhead();
    expect(store.getState().timeline.currentTimeSeconds).toBe(3.25);
    vi.useRealTimers();
  });

  it("keeps accepting playhead writes after a Strict Mode cleanup replay", () => {
    const store = createToolcraftStore({ schema: appSchema });

    store.dispose();
    store.setPlayhead(1.25, 1_250);

    expect(store.getPlayhead()).toBe(1.25);
    expect(store.jotai.get(store.atoms.playhead)).toBe(1.25);
  });

  it("limits published playhead updates to 30 Hz", () => {
    const store = createToolcraftStore({ schema: appSchema });
    const listener = vi.fn();
    const unsubscribe = store.jotai.sub(store.atoms.playhead, listener);

    for (let frame = 1; frame <= 60; frame += 1) {
      store.setPlayhead(frame / 60, frame * (1_000 / 60));
    }

    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls.length).toBeLessThanOrEqual(31);
    expect(store.getPlayhead()).toBe(1);
    unsubscribe();
    store.dispose();
  });

  it("publishes every transient playhead frame to imperative renderers", () => {
    const store = createToolcraftStore({ schema: appSchema });
    const listener = vi.fn();
    const unsubscribe = store.subscribePlayhead(listener);

    store.setPlayhead(0.25, 250);
    store.setPlayhead(0.5, 500);
    store.dispatch({ currentTimeSeconds: 0.75, type: "timeline.setCurrentTime" });

    expect(listener).toHaveBeenNthCalledWith(1, 0.25, 250);
    expect(listener).toHaveBeenNthCalledWith(2, 0.5, 500);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    store.setPlayhead(1, 1_000);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("supports record, merge, and skip history modes", () => {
    const store = createToolcraftStore({ schema: appSchema });

    store.dispatch({ target: "gradient.seed", type: "controls.setValue", value: 20 });
    store.dispatch({ history: "skip", target: "gradient.spread", type: "controls.setValue", value: 70 });
    store.dispatch({ history: "merge", historyGroup: "drag", target: "gradient.seed", type: "controls.setValue", value: 21 });
    store.dispatch({ history: "merge", historyGroup: "drag", target: "gradient.seed", type: "controls.setValue", value: 22 });

    expect(store.getState().history.undo).toHaveLength(2);
    store.dispatch({ type: "history.undo" });
    expect(store.getState().values["gradient.seed"]).toBe(20);
    expect(store.getState().values["gradient.spread"]).toBe(70);
  });

  it("produces persistence snapshots identical to reducer state", () => {
    const store = createToolcraftStore({ schema: appSchema });
    store.dispatch({ target: "gradient.seed", type: "controls.setValue", value: 55 });

    expect(createToolcraftPersistenceSnapshot(store.getState(), appSchema.persistence)).toEqual(
      createToolcraftPersistenceSnapshot(
        toolcraftReducer(createToolcraftState(appSchema), {
          target: "gradient.seed",
          type: "controls.setValue",
          value: 55,
        }),
        appSchema.persistence,
      ),
    );
  });
});

describe("selective React subscriptions", () => {
  it("flushes a pending setting change when the tool unmounts", () => {
    const storageKey = appSchema.persistence.storage === "localStorage"
      ? appSchema.persistence.key
      : "";
    window.localStorage.removeItem(storageKey);
    let dispatch: ToolcraftDispatch | undefined;

    function PersistenceProbe(): null {
      dispatch = useToolcraftDispatch();
      return null;
    }

    const view = render(
      <ToolcraftRoot schema={appSchema}>
        <PersistenceProbe />
      </ToolcraftRoot>,
    );
    act(() => {
      dispatch?.({ target: "gradient.blur", type: "controls.setValue", value: 47 });
    });
    view.unmount();

    const persisted = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as {
      state?: { values?: Record<string, unknown> };
    } | null;
    expect(persisted?.state?.values?.["gradient.blur"]).toBe(47);
    window.localStorage.removeItem(storageKey);
  });

  it("does not rerender a target subscriber when another target changes", () => {
    let dispatch: ToolcraftDispatch | undefined;
    let renders = 0;

    function Probe(): React.JSX.Element {
      dispatch = useToolcraftDispatch();
      const value = useToolcraftValue("gradient.seed");
      renders += 1;
      return <output>{String(value)}</output>;
    }

    render(
      <ToolcraftRoot schema={appSchema}>
        <Probe />
      </ToolcraftRoot>,
    );
    const baseline = renders;

    act(() => {
      dispatch?.({ target: "gradient.spread", type: "controls.setValue", value: 75 });
    });
    expect(renders).toBe(baseline);

    act(() => {
      dispatch?.({ target: "gradient.seed", type: "controls.setValue", value: 44 });
    });
    expect(renders).toBe(baseline + 1);
  });
});
