import {
  getToolcraftCanvasSizeTargetDimension,
  isToolcraftCanvasAspectRatioTarget,
  isToolcraftTimelinePanelExtendedTarget,
  isToolcraftTimelinePanelVisibleTarget,
} from "../schema/runtime-targets";
import {
  applyToolcraftCanvasAspectRatioToSize,
  asToolcraftCanvasSizeDimension,
  getToolcraftCanvasAspectRatioFromSize,
  getToolcraftCanvasAspectRatioPresetSize,
  getToolcraftResetCanvasSize,
  normalizeToolcraftCanvasAspectRatioValue,
  toolcraftCanvasAspectRatioTarget,
  toolcraftCanvasAspectRatioValuesEqual,
  toolcraftCanvasSizesEqual,
  toolcraftCanvasSizeHeightTarget,
  toolcraftCanvasSizeWidthTarget,
} from "./canvas-state";
import {
  commitToolcraftStatePatch,
  commitToolcraftValuePatch,
} from "./history-patches";
import { getToolcraftResetMediaPatch } from "./media-state";
import type {
  ToolcraftCommand,
  ToolcraftState,
} from "./types";

type ToolcraftControlsCommand = Extract<
  ToolcraftCommand,
  {
    type: "controls.apply" | "controls.reset" | "controls.resetTargets" | "controls.setValue";
  }
>;

export function reduceToolcraftControlsCommand(
  state: ToolcraftState,
  command: ToolcraftControlsCommand,
): ToolcraftState {
  switch (command.type) {
    case "controls.setValue": {
      const canvasSizeDimension = getToolcraftCanvasSizeTargetDimension(command.target);

      if (isToolcraftTimelinePanelExtendedTarget(command.target)) {
        const extended = command.value === true;

        if (state.panels.timeline.extended === extended) {
          return state;
        }

        return {
          ...state,
          panels: {
            ...state.panels,
            timeline: {
              ...state.panels.timeline,
              extended,
            },
          },
        };
      }

      if (isToolcraftTimelinePanelVisibleTarget(command.target)) {
        const hidden = command.value === false;

        if (state.panels.timeline.hidden === hidden) {
          return state;
        }

        return {
          ...state,
          panels: {
            ...state.panels,
            timeline: {
              ...state.panels.timeline,
              hidden,
            },
          },
        };
      }

      if (isToolcraftCanvasAspectRatioTarget(command.target)) {
        const ratio = normalizeToolcraftCanvasAspectRatioValue(
          command.value,
          state.canvas.size,
        );
        const size =
          getToolcraftCanvasAspectRatioPresetSize(ratio) ??
          applyToolcraftCanvasAspectRatioToSize({
            anchor: "width",
            ratio,
            size: state.canvas.size,
            value: state.canvas.size.width,
          });

        if (
          state.canvas.size.width === size.width &&
          state.canvas.size.height === size.height &&
          toolcraftCanvasAspectRatioValuesEqual(state.values[command.target], ratio)
        ) {
          return state;
        }

        return commitToolcraftStatePatch(state, {
          after: {
            [toolcraftCanvasAspectRatioTarget]: ratio,
            "canvas.size": size,
            [toolcraftCanvasSizeWidthTarget]: size.width,
            [toolcraftCanvasSizeHeightTarget]: size.height,
          },
          before: {
            [toolcraftCanvasAspectRatioTarget]: state.values[command.target],
            "canvas.size": state.canvas.size,
            [toolcraftCanvasSizeWidthTarget]: state.values[toolcraftCanvasSizeWidthTarget],
            [toolcraftCanvasSizeHeightTarget]: state.values[toolcraftCanvasSizeHeightTarget],
          },
          label: command.label ?? command.target,
        }, {
          group: command.historyGroup,
          mode: command.history,
        });
      }

      if (canvasSizeDimension) {
        const dimensionValue = asToolcraftCanvasSizeDimension(command.value);

        if (dimensionValue === null) {
          return state;
        }

        const hasAspectRatioControl =
          toolcraftCanvasAspectRatioTarget in state.values ||
          toolcraftCanvasAspectRatioTarget in state.defaults;
        const size = {
          ...state.canvas.size,
          [canvasSizeDimension]: dimensionValue,
        };
        const aspectRatio = getToolcraftCanvasAspectRatioFromSize(size);
        const targetValue = size[canvasSizeDimension];
        const otherTarget =
          canvasSizeDimension === "width"
            ? toolcraftCanvasSizeHeightTarget
            : toolcraftCanvasSizeWidthTarget;
        const otherValue = canvasSizeDimension === "width" ? size.height : size.width;

        const sizeUnchanged =
          state.canvas.size.width === size.width &&
          state.canvas.size.height === size.height &&
          state.values[command.target] === targetValue &&
          state.values[otherTarget] === otherValue;

        if (sizeUnchanged) {
          return state;
        }

        return commitToolcraftStatePatch(state, {
          after: {
            ...(hasAspectRatioControl
              ? { [toolcraftCanvasAspectRatioTarget]: aspectRatio }
              : {}),
            "canvas.size": size,
            [command.target]: targetValue,
            [otherTarget]: otherValue,
          },
          before: {
            ...(hasAspectRatioControl
              ? { [toolcraftCanvasAspectRatioTarget]: state.values[toolcraftCanvasAspectRatioTarget] }
              : {}),
            "canvas.size": state.canvas.size,
            [command.target]: state.values[command.target],
            [otherTarget]: state.values[otherTarget],
          },
          label: command.label ?? command.target,
        }, {
          group: command.historyGroup,
          mode: command.history,
        });
      }

      if (Object.is(state.values[command.target], command.value)) {
        return state;
      }

      return commitToolcraftValuePatch(
        state,
        {
          after: { [command.target]: command.value },
          before: { [command.target]: state.values[command.target] },
          label: command.label ?? command.target,
        },
        { ...state.values, [command.target]: command.value },
        {
          group: command.historyGroup,
          mode: command.history,
        },
      );
    }

    case "controls.apply":
      return state;

    case "controls.reset": {
      const resetCanvasSize = getToolcraftResetCanvasSize(state);
      const resetMediaPatch = getToolcraftResetMediaPatch(state);

      if (resetCanvasSize || resetMediaPatch) {
        return commitToolcraftStatePatch(state, {
          after: {
            ...state.defaults,
            ...(resetCanvasSize ? { "canvas.size": resetCanvasSize } : {}),
            ...resetMediaPatch?.after,
          },
          before: {
            ...state.values,
            ...(resetCanvasSize ? { "canvas.size": state.canvas.size } : {}),
            ...resetMediaPatch?.before,
          },
          label: "Reset controls",
        });
      }

      return commitToolcraftValuePatch(
        state,
        {
          after: { ...state.defaults },
          before: { ...state.values },
          label: "Reset controls",
        },
        { ...state.defaults },
      );
    }

    case "controls.resetTargets": {
      const targetSet = new Set(command.targets);
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      const resetMediaPatch = getToolcraftResetMediaPatch(state, targetSet);

      for (const target of targetSet) {
        if (!(target in state.defaults) || Object.is(state.values[target], state.defaults[target])) {
          continue;
        }

        before[target] = state.values[target];
        after[target] = state.defaults[target];
      }

      const resetCanvasSize = getToolcraftResetCanvasSize(state);
      const shouldResetCanvasSize =
        resetCanvasSize !== null &&
        (targetSet.has(toolcraftCanvasSizeWidthTarget) ||
          targetSet.has(toolcraftCanvasSizeHeightTarget)) &&
        !toolcraftCanvasSizesEqual(state.canvas.size, resetCanvasSize);

      if (shouldResetCanvasSize) {
        before["canvas.size"] = state.canvas.size;
        after["canvas.size"] = resetCanvasSize;
      }

      if (resetMediaPatch) {
        Object.assign(before, resetMediaPatch.before);
        Object.assign(after, resetMediaPatch.after);
      }

      if (Object.keys(after).length === 0) {
        return state;
      }

      return commitToolcraftStatePatch(state, {
        after,
        before,
        label: command.label ?? "Reset section",
      });
    }
  }
}
