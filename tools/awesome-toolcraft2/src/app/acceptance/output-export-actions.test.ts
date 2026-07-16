import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import {
  schemaHasPngExportPanelAction,
  schemaHasVideoExportPanelAction,
} from "./output-export-actions";

function createOutputSchema() {
  return defineToolcraft({
    canvas: { enabled: true },
    panels: {
      controls: {
        sections: [
          {
            controls: {
              output: {
                actions: [
                  {
                    label: "Guardar imagen",
                    role: "export-image",
                    value: "salida.imagen",
                  },
                  {
                    label: "Guardar movimiento",
                    role: "export-video",
                    value: "salida.movimiento",
                  },
                ],
                target: "salida.acciones",
                type: "panelActions",
              },
            },
            title: "Salida",
          },
        ],
        title: "Controles",
      },
    },
  });
}

describe("Toolcraft typed output action roles", () => {
  it("detects image and video export without parsing labels or values", () => {
    const schema = createOutputSchema();

    expect(schemaHasPngExportPanelAction(schema)).toBe(true);
    expect(schemaHasVideoExportPanelAction(schema)).toBe(true);
  });

  it("does not treat export-like prose as semantic output evidence", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                output: {
                  actions: [{ label: "Export PNG", value: "export.png" }],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Output",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(schemaHasPngExportPanelAction(schema)).toBe(false);
    expect(schemaHasVideoExportPanelAction(schema)).toBe(false);
  });
});
