import { commitToolcraftStatePatch } from "./history-patches";
import {
  clampToolcraftTimelineDurationSeconds,
  clampToolcraftTimelineTime,
  getToolcraftTimelineKeyframeId,
  roundToolcraftTimelineKeyframeTime,
  toolcraftTimelineMinDurationSeconds,
} from "./timeline-values";
import type {
  ToolcraftCommand,
  ToolcraftState,
  ToolcraftTimelineKeyframe,
  ToolcraftTimelineKeyframeGroup,
} from "./types";

type ToolcraftTimelineCommand = Extract<
  ToolcraftCommand,
  {
    type:
      | "timeline.changeKeyframeEasing"
      | "timeline.deleteControlKeyframes"
      | "timeline.deleteKeyframe"
      | "timeline.moveKeyframe"
      | "timeline.selectKeyframe"
      | "timeline.setCurrentTime"
      | "timeline.setDuration"
      | "timeline.setExpanded"
      | "timeline.setPlaying"
      | "timeline.toggleControlKeyframes"
      | "timeline.toggleExpanded"
      | "timeline.toggleLoop"
      | "timeline.togglePlayback"
      | "timeline.upsertControlKeyframe";
  }
>;

function createTimelineControlKeyframe({
  controlId,
  controlLabel,
  state,
  timeSeconds,
  value,
  valueLabel,
}: {
  controlId: string;
  controlLabel: string;
  state: ToolcraftState;
  timeSeconds?: number;
  value: unknown;
  valueLabel: string;
}): ToolcraftTimelineKeyframe {
  const resolvedTimeSeconds = roundToolcraftTimelineKeyframeTime(
    clampToolcraftTimelineTime(
      timeSeconds ?? state.timeline.currentTimeSeconds,
      state.timeline.durationSeconds,
    ),
  );

  return {
    controlId,
    controlLabel,
    id: getToolcraftTimelineKeyframeId(controlId, resolvedTimeSeconds),
    timeSeconds: resolvedTimeSeconds,
    value,
    valueLabel,
  };
}

function upsertTimelineControlKeyframeGroup({
  controlId,
  controlLabel,
  keyframe,
  keyframeGroups,
}: {
  controlId: string;
  controlLabel: string;
  keyframe: ToolcraftTimelineKeyframe;
  keyframeGroups: readonly ToolcraftTimelineKeyframeGroup[];
}): ToolcraftTimelineKeyframeGroup[] {
  const existingGroup = keyframeGroups.find((group) => group.controlId === controlId);
  const nextKeyframes = [
    ...(existingGroup?.keyframes.filter((item) => item.id !== keyframe.id) ?? []),
    keyframe,
  ].sort(
    (firstKeyframe, secondKeyframe) => firstKeyframe.timeSeconds - secondKeyframe.timeSeconds,
  );
  const nextGroup: ToolcraftTimelineKeyframeGroup = {
    controlId,
    keyframes: nextKeyframes,
    label: existingGroup?.label ?? controlLabel,
  };

  if (!existingGroup) {
    return [...keyframeGroups, nextGroup];
  }

  return keyframeGroups.map((group) => (group.controlId === controlId ? nextGroup : group));
}

function mapTimelineKeyframeGroups(
  keyframeGroups: readonly ToolcraftTimelineKeyframeGroup[],
  keyframeId: string,
  updateKeyframe: (
    keyframe: ToolcraftTimelineKeyframeGroup["keyframes"][number],
  ) => ToolcraftTimelineKeyframeGroup["keyframes"][number],
): ToolcraftTimelineKeyframeGroup[] {
  return keyframeGroups.map((group) => ({
    ...group,
    keyframes: group.keyframes.map((keyframe) =>
      keyframe.id === keyframeId ? updateKeyframe(keyframe) : keyframe,
    ),
  }));
}

export function reduceToolcraftTimelineCommand(
  state: ToolcraftState,
  command: ToolcraftTimelineCommand,
): ToolcraftState {
  switch (command.type) {
    case "timeline.setCurrentTime": {
      return {
        ...state,
        timeline: {
          ...state.timeline,
          currentTimeSeconds: clampToolcraftTimelineTime(
            command.currentTimeSeconds,
            state.timeline.durationSeconds,
          ),
        },
      };
    }

    case "timeline.setDuration": {
      const durationSeconds = clampToolcraftTimelineDurationSeconds(
        command.durationSeconds,
        toolcraftTimelineMinDurationSeconds,
      );
      const timeline = {
        ...state.timeline,
        currentTimeSeconds: clampToolcraftTimelineTime(
          state.timeline.currentTimeSeconds,
          durationSeconds,
        ),
        durationSeconds,
      };

      return commitToolcraftStatePatch(state, {
        after: { timeline },
        before: { timeline: state.timeline },
        label: "Set timeline duration",
      });
    }

    case "timeline.setExpanded": {
      if (state.timeline.expanded === command.expanded) {
        return state;
      }

      return {
        ...state,
        timeline: {
          ...state.timeline,
          expanded: command.expanded,
        },
      };
    }

    case "timeline.toggleExpanded": {
      return {
        ...state,
        timeline: {
          ...state.timeline,
          expanded: !state.timeline.expanded,
        },
      };
    }

    case "timeline.setPlaying": {
      return {
        ...state,
        timeline: {
          ...state.timeline,
          isPlaying: command.isPlaying,
        },
      };
    }

    case "timeline.togglePlayback": {
      const shouldRestartPlayback =
        !state.timeline.isPlaying &&
        state.timeline.currentTimeSeconds >= state.timeline.durationSeconds;

      return {
        ...state,
        timeline: {
          ...state.timeline,
          currentTimeSeconds: shouldRestartPlayback ? 0 : state.timeline.currentTimeSeconds,
          isPlaying: !state.timeline.isPlaying,
        },
      };
    }

    case "timeline.toggleLoop": {
      return {
        ...state,
        timeline: {
          ...state.timeline,
          isLooping: !state.timeline.isLooping,
        },
      };
    }

    case "timeline.selectKeyframe": {
      return {
        ...state,
        timeline: {
          ...state.timeline,
          selectedKeyframeId: command.keyframeId,
        },
      };
    }

    case "timeline.deleteKeyframe": {
      if (
        !state.timeline.keyframeGroups.some((group) =>
          group.keyframes.some((keyframe) => keyframe.id === command.keyframeId),
        )
      ) {
        return state;
      }

      const timeline = {
        ...state.timeline,
        keyframeGroups: state.timeline.keyframeGroups
          .map((group) => ({
            ...group,
            keyframes: group.keyframes.filter((keyframe) => keyframe.id !== command.keyframeId),
          }))
          .filter((group) => group.keyframes.length > 0),
        selectedKeyframeId: null,
      };

      return commitToolcraftStatePatch(state, {
        after: { timeline },
        before: { timeline: state.timeline },
        label: "Delete keyframe",
      });
    }

    case "timeline.deleteControlKeyframes": {
      if (!state.timeline.keyframeGroups.some((group) => group.controlId === command.controlId)) {
        return state;
      }

      const timeline = {
        ...state.timeline,
        keyframeGroups: state.timeline.keyframeGroups.filter(
          (group) => group.controlId !== command.controlId,
        ),
        selectedKeyframeId: null,
      };

      return commitToolcraftStatePatch(state, {
        after: { timeline },
        before: { timeline: state.timeline },
        label: "Delete control keyframes",
      });
    }

    case "timeline.toggleControlKeyframes": {
      const existingGroup = state.timeline.keyframeGroups.find(
        (group) => group.controlId === command.controlId,
      );

      if (existingGroup) {
        const timeline = {
          ...state.timeline,
          expanded: true,
          keyframeGroups: state.timeline.keyframeGroups.filter(
            (group) => group.controlId !== command.controlId,
          ),
          selectedKeyframeId: null,
        };

        return commitToolcraftStatePatch(state, {
          after: { timeline },
          before: { timeline: state.timeline },
          label: "Delete control keyframes",
        });
      }

      const keyframe = createTimelineControlKeyframe({
        controlId: command.controlId,
        controlLabel: command.controlLabel,
        state,
        timeSeconds: command.timeSeconds,
        value: command.value,
        valueLabel: command.valueLabel,
      });
      const timeline = {
        ...state.timeline,
        expanded: true,
        keyframeGroups: upsertTimelineControlKeyframeGroup({
          controlId: command.controlId,
          controlLabel: command.controlLabel,
          keyframe,
          keyframeGroups: state.timeline.keyframeGroups,
        }),
        selectedKeyframeId: keyframe.id,
      };

      return commitToolcraftStatePatch(state, {
        after: { timeline },
        before: { timeline: state.timeline },
        label: "Add control keyframe",
      });
    }

    case "timeline.upsertControlKeyframe": {
      const keyframe = createTimelineControlKeyframe({
        controlId: command.controlId,
        controlLabel: command.controlLabel,
        state,
        timeSeconds: command.timeSeconds,
        value: command.value,
        valueLabel: command.valueLabel,
      });
      const timeline = {
        ...state.timeline,
        expanded: true,
        keyframeGroups: upsertTimelineControlKeyframeGroup({
          controlId: command.controlId,
          controlLabel: command.controlLabel,
          keyframe,
          keyframeGroups: state.timeline.keyframeGroups,
        }),
        selectedKeyframeId: keyframe.id,
      };

      return commitToolcraftStatePatch(state, {
        after: { timeline },
        before: { timeline: state.timeline },
        label: "Set control keyframe",
      });
    }

    case "timeline.moveKeyframe": {
      const targetKeyframe = state.timeline.keyframeGroups
        .flatMap((group) => group.keyframes)
        .find((keyframe) => keyframe.id === command.keyframeId);

      if (!targetKeyframe) {
        return state;
      }

      const timeSeconds = roundToolcraftTimelineKeyframeTime(
        clampToolcraftTimelineTime(command.timeSeconds, state.timeline.durationSeconds),
      );
      const nextKeyframeId = getToolcraftTimelineKeyframeId(
        targetKeyframe.controlId,
        timeSeconds,
      );
      const timeline = {
        ...state.timeline,
        keyframeGroups: mapTimelineKeyframeGroups(
          state.timeline.keyframeGroups,
          command.keyframeId,
          (keyframe) => ({
            ...keyframe,
            id: nextKeyframeId,
            timeSeconds,
          }),
        ),
        selectedKeyframeId: nextKeyframeId,
      };

      return commitToolcraftStatePatch(state, {
        after: { timeline },
        before: { timeline: state.timeline },
        label: "Move keyframe",
      });
    }

    case "timeline.changeKeyframeEasing": {
      if (
        !state.timeline.keyframeGroups.some((group) =>
          group.keyframes.some((keyframe) => keyframe.id === command.keyframeId),
        )
      ) {
        return state;
      }

      const timeline = {
        ...state.timeline,
        keyframeGroups: mapTimelineKeyframeGroups(
          state.timeline.keyframeGroups,
          command.keyframeId,
          (keyframe) => ({
            ...keyframe,
            easing: command.easing,
          }),
        ),
      };

      return commitToolcraftStatePatch(state, {
        after: { timeline },
        before: { timeline: state.timeline },
        label: "Change keyframe easing",
      });
    }
  }
}
