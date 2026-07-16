import { describe, expect, it } from "vitest";

import {
  contractAcceptanceFixture,
  contractSchemaFixture,
  validateContractAcceptance,
} from "./app-acceptance.contract-fixtures";
import { playbackTimelineAcceptance } from "./app-acceptance.timeline-test-utils";

describe("starter acceptance layers contract", () => {
  it("requires layer behavior coverage when a layers panel is enabled", () => {
    const layersSchema = {
      ...contractSchemaFixture,
      panels: {
        ...contractSchemaFixture.panels,
        layers: true,
      },
    };

    expect(
      validateContractAcceptance({
        schema: layersSchema,
        acceptance: contractAcceptanceFixture,
      }),
    ).toEqual(
      expect.arrayContaining([
        'panels.layers requires a runtime acceptance entry with layerCoverage "selection" proving layer selection behavior.',
        'panels.layers requires a runtime acceptance entry with layerCoverage "visibility" proving layer visibility behavior.',
        'panels.layers requires a runtime acceptance entry with layerCoverage "reorder" proving layer reorder behavior.',
        'panels.layers requires a runtime acceptance entry with layerCoverage "grouping" proving layer grouping behavior.',
      ]),
    );
  });

  it("rejects selectedLayer targets when the layers panel is disabled", () => {
    const schemaWithSelectedLayerControl = {
      ...contractSchemaFixture,
      panels: {
        ...contractSchemaFixture.panels,
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 75,
                  label: "Opacity",
                  max: 100,
                  min: 0,
                  target: "selectedLayer.opacity",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Layer",
            },
          ],
          title: "Controls",
        },
      },
    };

    expect(
      validateContractAcceptance({
        schema: schemaWithSelectedLayerControl,
        acceptance: [
          playbackTimelineAcceptance,
          {
            automated: true,
            automatedTestName: "opacity changes rendered output",
            browser: true,
            browserTestName: "browser: opacity slider changes rendered output",
            componentType: "slider",
            evidence: "rendered-pixels",
            expectedObservable: "Changing Opacity changes layer transparency.",
            fixture: "opacity fixture",
            id: "selectedLayer.opacity",
            kind: "control",
            target: "selectedLayer.opacity",
            userAction: "Drag the Opacity slider.",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "Layer / opacity (selectedLayer.opacity) uses reserved selectedLayer.* target without panels.layers enabled. Use an app-specific target for single-layer apps or enable layers with layerCoverage.",
      ]),
    );
  });

  it("requires selectedLayer controls to prove currently selected layer behavior", () => {
    const layeredSchema = {
      ...contractSchemaFixture,
      panels: {
        ...contractSchemaFixture.panels,
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 75,
                  label: "Opacity",
                  max: 100,
                  min: 0,
                  target: "selectedLayer.opacity",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Layer",
            },
          ],
          title: "Controls",
        },
        layers: true,
      },
    };

    expect(
      validateContractAcceptance({
        schema: layeredSchema,
        acceptance: [
          playbackTimelineAcceptance,
          {
            automated: true,
            automatedTestName: "layer selection changes selected runtime layer",
            browser: true,
            browserTestName: "browser: layers selection changes selected runtime layer",
            componentType: "layers",
            evidence: "product-output",
            expectedObservable: "Selecting another layer changes which output layer is edited.",
            fixture: "layered output fixture",
            id: "layers.selection",
            kind: "runtime",
            layerCoverage: "selection",
            userAction: "Select another layer.",
          },
          {
            automated: true,
            automatedTestName: "layer visibility hides nested layer output",
            browser: true,
            browserTestName: "browser: layers visibility hides nested layer output",
            componentType: "layers",
            evidence: "product-output",
            expectedObservable: "Toggling layer visibility removes that layer from output.",
            fixture: "layered output fixture",
            id: "layers.visibility",
            kind: "runtime",
            layerCoverage: "visibility",
            userAction: "Toggle a layer visibility button.",
          },
          {
            automated: true,
            automatedTestName: "layer reorder changes render order",
            browser: true,
            browserTestName: "browser: layers reorder changes render order",
            componentType: "layers",
            evidence: "product-output",
            expectedObservable: "Dragging a layer changes composited render order.",
            fixture: "overlapping layers fixture",
            id: "layers.reorder",
            kind: "runtime",
            layerCoverage: "reorder",
            userAction: "Drag a layer before another layer.",
          },
          {
            automated: true,
            automatedTestName: "layer grouping nests layer output",
            browser: true,
            browserTestName: "browser: layers grouping nests layer output",
            componentType: "layers",
            evidence: "product-output",
            expectedObservable: "Dragging a layer into a group nests it and group visibility affects the nested output.",
            fixture: "grouped layers fixture",
            id: "layers.grouping",
            kind: "runtime",
            layerCoverage: "grouping",
            userAction: "Drag a layer into a group.",
          },
          {
            automated: true,
            automatedTestName: "opacity changes rendered output",
            browser: true,
            browserTestName: "browser: opacity slider changes rendered output",
            componentType: "slider",
            evidence: "rendered-pixels",
            expectedObservable: "Changing Opacity changes layer transparency.",
            fixture: "opacity fixture",
            id: "selectedLayer.opacity",
            kind: "control",
            target: "selectedLayer.opacity",
            userAction: "Drag the Opacity slider.",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Layer / opacity (selectedLayer.opacity) targets selectedLayer.* and must have acceptance layerCoverage "selected-layer-controls" proving the control edits the currently selected layer output.',
      ]),
    );
  });


});
