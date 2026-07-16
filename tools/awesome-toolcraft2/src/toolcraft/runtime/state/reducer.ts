import { reduceToolcraftCanvasCommand } from "./canvas-reducer";
import { reduceToolcraftControlsCommand } from "./controls-reducer";
import {
  redoToolcraftHistory,
  undoToolcraftHistory,
} from "./history-patches";
import { reduceToolcraftLayersCommand } from "./layers-reducer";
import { reduceToolcraftMediaCommand } from "./media-reducer";
import { reduceToolcraftPanelsCommand } from "./panels-reducer";
import { reduceToolcraftTimelineCommand } from "./timeline-reducer";
import type {
  ToolcraftCommand,
  ToolcraftState,
} from "./types";

export function toolcraftReducer(
  state: ToolcraftState,
  command: ToolcraftCommand,
): ToolcraftState {
  switch (command.type) {
    case "controls.apply":
    case "controls.reset":
    case "controls.resetTargets":
    case "controls.setValue":
      return reduceToolcraftControlsCommand(state, command);

    case "layers.add":
    case "layers.delete":
    case "layers.moveToGroup":
    case "layers.rename":
    case "layers.reorder":
    case "layers.select":
    case "layers.toggleCollapsed":
    case "layers.toggleVisibility":
      return reduceToolcraftLayersCommand(state, command);

    case "canvas.center":
    case "canvas.panBy":
    case "canvas.setOffset":
    case "canvas.setSize":
    case "canvas.setViewport":
    case "canvas.zoomIn":
    case "canvas.zoomOut":
    case "canvas.zoomReset":
      return reduceToolcraftCanvasCommand(state, command);

    case "panels.resetOffset":
    case "panels.setHidden":
    case "panels.setOffset":
      return reduceToolcraftPanelsCommand(state, command);

    case "media.delete":
    case "media.import":
    case "media.reorder":
    case "media.transform":
      return reduceToolcraftMediaCommand(state, command);

    case "timeline.changeKeyframeEasing":
    case "timeline.deleteControlKeyframes":
    case "timeline.deleteKeyframe":
    case "timeline.moveKeyframe":
    case "timeline.selectKeyframe":
    case "timeline.setCurrentTime":
    case "timeline.setDuration":
    case "timeline.setExpanded":
    case "timeline.setPlaying":
    case "timeline.toggleControlKeyframes":
    case "timeline.toggleExpanded":
    case "timeline.toggleLoop":
    case "timeline.togglePlayback":
    case "timeline.upsertControlKeyframe":
      return reduceToolcraftTimelineCommand(state, command);

    case "history.undo":
      return undoToolcraftHistory(state);

    case "history.redo":
      return redoToolcraftHistory(state);
  }
}
