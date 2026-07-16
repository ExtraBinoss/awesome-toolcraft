import type {
  ToolcraftCommand,
  ToolcraftState,
} from "./types";

type ToolcraftPanelsCommand = Extract<
  ToolcraftCommand,
  {
    type: "panels.resetOffset" | "panels.setHidden" | "panels.setOffset";
  }
>;

export function reduceToolcraftPanelsCommand(
  state: ToolcraftState,
  command: ToolcraftPanelsCommand,
): ToolcraftState {
  switch (command.type) {
    case "panels.setOffset":
      return {
        ...state,
        panels: {
          ...state.panels,
          [command.panelId]: {
            ...state.panels[command.panelId],
            offset: command.offset,
          },
        },
      };

    case "panels.setHidden":
      if (state.panels[command.panelId].hidden === command.hidden) {
        return state;
      }

      return {
        ...state,
        panels: {
          ...state.panels,
          [command.panelId]: {
            ...state.panels[command.panelId],
            hidden: command.hidden,
          },
        },
      };

    case "panels.resetOffset":
      return {
        ...state,
        panels: {
          ...state.panels,
          [command.panelId]: {
            ...state.panels[command.panelId],
            offset: { x: 0, y: 0 },
          },
        },
      };
  }
}
