import {
  clampToolcraftCanvasZoom,
  toolcraftCanvasZoomDefault,
  toolcraftCanvasZoomStep,
} from "./canvas-zoom";
import { commitToolcraftStatePatch } from "./history-patches";
import type {
  ToolcraftCommand,
  ToolcraftState,
} from "./types";

type ToolcraftCanvasCommand = Extract<
  ToolcraftCommand,
  {
    type:
      | "canvas.center"
      | "canvas.panBy"
      | "canvas.setOffset"
      | "canvas.setSize"
      | "canvas.setViewport"
      | "canvas.zoomIn"
      | "canvas.zoomOut"
      | "canvas.zoomReset";
  }
>;

export function reduceToolcraftCanvasCommand(
  state: ToolcraftState,
  command: ToolcraftCanvasCommand,
): ToolcraftState {
  switch (command.type) {
    case "canvas.setOffset":
      return {
        ...state,
        canvas: {
          ...state.canvas,
          offset: command.offset,
        },
      };

    case "canvas.panBy":
      return {
        ...state,
        canvas: {
          ...state.canvas,
          offset: {
            x: state.canvas.offset.x + command.delta.x,
            y: state.canvas.offset.y + command.delta.y,
          },
        },
      };

    case "canvas.setSize":
      return commitToolcraftStatePatch(state, {
        after: { "canvas.size": command.size },
        before: { "canvas.size": state.canvas.size },
        label: "Resize canvas",
      });

    case "canvas.center":
      return {
        ...state,
        canvas: {
          ...state.canvas,
          offset: { x: 0, y: 0 },
        },
      };

    case "canvas.zoomIn":
      return {
        ...state,
        canvas: {
          ...state.canvas,
          zoom: clampToolcraftCanvasZoom(state.canvas.zoom + toolcraftCanvasZoomStep),
        },
      };

    case "canvas.zoomOut":
      return {
        ...state,
        canvas: {
          ...state.canvas,
          zoom: clampToolcraftCanvasZoom(state.canvas.zoom - toolcraftCanvasZoomStep),
        },
      };

    case "canvas.zoomReset":
      return {
        ...state,
        canvas: {
          ...state.canvas,
          zoom: toolcraftCanvasZoomDefault,
        },
      };

    case "canvas.setViewport":
      return {
        ...state,
        canvas: {
          ...state.canvas,
          offset: command.offset,
          zoom: clampToolcraftCanvasZoom(command.zoom),
        },
      };
  }
}
