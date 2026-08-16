import { describe, expect, it } from "vitest";

import { appSchema } from "@/tools/gradient-generator/app-schema";
import { filterLayoutGroupsForControlIds } from "../schema/controls-panel-layout-groups";
import { createToolcraftState } from "../state/create-template-state";
import { toolcraftReducer } from "../state/reducer";

describe("runtime cleanup behavior", () => {
  it("filters layout groups in one pass without changing group order", () => {
    const groups = filterLayoutGroupsForControlIds(
      [
        { columns: 2, controls: ["first", "second"], layout: "inline" },
        { columns: 2, controls: ["first"], layout: "inline" },
        { columns: 2, controls: ["second", "third"], layout: "inline" },
      ],
      new Set(["first", "second"]),
    );

    expect(groups).toEqual([
      { columns: 2, controls: ["first", "second"], layout: "inline" },
    ]);
  });

  it("keeps layer movement stable while comparing the complete layer list", () => {
    const initialState = createToolcraftState(appSchema);
    const withGroup = toolcraftReducer(initialState, {
      layer: { id: "cleanup-group", kind: "group", name: "Cleanup group" },
      type: "layers.add",
    });
    const withLayer = toolcraftReducer(withGroup, {
      layer: { id: "cleanup-layer", name: "Cleanup layer" },
      type: "layers.add",
    });
    const moved = toolcraftReducer(withLayer, {
      layerIds: ["cleanup-layer"],
      parentGroupId: "cleanup-group",
      type: "layers.moveToGroup",
    });

    expect(moved.layers).toHaveLength(withLayer.layers.length);
    expect(moved.layers.find((layer) => layer.id === "cleanup-layer"))
      .toMatchObject({ parentGroupId: "cleanup-group" });
  });

  it("removes an empty keyframe group while preserving other timeline state", () => {
    const initialState = createToolcraftState(appSchema);
    const withKeyframe = toolcraftReducer(initialState, {
      controlId: "gradient.seed",
      controlLabel: "Seed",
      timeSeconds: 1,
      type: "timeline.upsertControlKeyframe",
      value: 55,
      valueLabel: "55",
    });
    const keyframeId = withKeyframe.timeline.keyframeGroups[0]?.keyframes[0]?.id;

    expect(keyframeId).toBeDefined();

    const deleted = toolcraftReducer(withKeyframe, {
      keyframeId: keyframeId ?? "missing",
      type: "timeline.deleteKeyframe",
    });

    expect(deleted.timeline.keyframeGroups).toEqual([]);
    expect(deleted.timeline.selectedKeyframeId).toBeNull();
  });
});
