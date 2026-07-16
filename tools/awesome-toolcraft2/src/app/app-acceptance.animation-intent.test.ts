import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import {
  contractSchemaFixture,
  validateContractAcceptance,
  validateContractAcceptanceDiagnostics,
} from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";
import { makeVideoExportSection } from "./app-acceptance.export-test-utils";
import {
  playbackTimelineAcceptance,
  productDerivedEightSecondLoop,
} from "./app-acceptance.timeline-test-utils";

describe("starter acceptance animation intent contract", () => {
  it("rejects right-panel transport controls when timeline playback owns transport", () => {
    const schemaWithPanelTransportControls = {
      ...contractSchemaFixture,
      panels: {
        ...contractSchemaFixture.panels,
        controls: {
          sections: [
            {
              controls: {
                pause: {
                  defaultValue: false,
                  label: "Paused",
                  orderRole: "primary",
                  target: "animation.paused",
                  type: "switch",
                },
                restart: {
                  actions: [
                    {
                      icon: "rotate-ccw",
                      label: "Restart",
                      value: "animation.restart",
                    },
                  ],
                  defaultValue: null,
                  label: "Run",
                  orderRole: "action",
                  target: "animation.actions",
                  type: "actions",
                },
              },
              title: "Run",
            },
          ],
          title: "Controls",
        },
        timeline: { defaultDurationSeconds: 8, enabled: true, mode: "playback" as const },
      },
    } as const;

    expect(
      validateContractAcceptance({
        schema: schemaWithPanelTransportControls,
        acceptance: [
          playbackTimelineAcceptance,
          {
            automated: true,
            automatedTestName: "paused switch freezes output",
            browser: true,
            browserTestName: "browser: paused switch freezes output",
            componentType: "switch",
            evidence: "timeline-output",
            expectedObservable: "Paused switch freezes the timeline output.",
            fixture: "timeline fixture",
            id: "animation.paused",
            kind: "control",
            target: "animation.paused",
            userAction: "Toggle Paused.",
          },
          {
            automated: true,
            automatedTestName: "restart action resets output",
            browser: true,
            browserTestName: "browser: restart action resets output",
            componentType: "actions",
            evidence: "timeline-output",
            expectedObservable: "Restart returns animation output to the first frame.",
            fixture: "timeline fixture",
            id: "animation.actions",
            kind: "control",
            target: "animation.actions",
            userAction: "Click Restart.",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "Run / pause (animation.paused) looks like an app-wide timeline transport control. Play, Pause, Animate, Resume, and Restart animation belong to the top timeline; keep right-panel controls for renderer parameters, generation/apply actions, and output delivery.",
        "Run / restart (animation.actions) looks like an app-wide timeline transport control. Play, Pause, Animate, Resume, and Restart animation belong to the top timeline; keep right-panel controls for renderer parameters, generation/apply actions, and output delivery.",
      ]),
    );
  });

  it("rejects right-panel transport controls even when the timeline was omitted", () => {
    const schemaWithOmittedTimelineAndPanelPause = {
      ...contractSchemaFixture,
      panels: {
        ...contractSchemaFixture.panels,
        controls: {
          sections: [
            {
              controls: {
                pause: {
                  defaultValue: false,
                  label: "Pause",
                  orderRole: "primary",
                  target: "animation.pause",
                  type: "switch",
                },
              },
              title: "Animation",
            },
          ],
          title: "Controls",
        },
        timeline: undefined,
      },
    } as const;

    expect(
      validateContractAcceptance({
        schema: schemaWithOmittedTimelineAndPanelPause,
        acceptance: [
          playbackTimelineAcceptance,
          {
            automated: true,
            automatedTestName: "pause switch freezes output",
            browser: true,
            browserTestName: "browser: pause switch freezes output",
            componentType: "switch",
            evidence: "timeline-output",
            expectedObservable: "Pause switch freezes animation output.",
            fixture: "timeline fixture",
            id: "animation.pause",
            kind: "control",
            target: "animation.pause",
            userAction: "Toggle Pause.",
          },
        ],
      }),
    ).toContain(
      "Animation / pause (animation.pause) looks like an app-wide timeline transport control. Play, Pause, Animate, Resume, and Restart animation belong to the top timeline; keep right-panel controls for renderer parameters, generation/apply actions, and output delivery.",
    );
  });

  it("requires autonomous animation intent when animation controls exist without a timeline", () => {
    const schemaWithAnimationControls = {
      ...contractSchemaFixture,
      panels: {
        ...contractSchemaFixture.panels,
        controls: {
          sections: [
            {
              controls: {
                speed: {
                  defaultValue: 64,
                  label: "Speed",
                  max: 100,
                  min: 0,
                  orderRole: "strength",
                  target: "animation.speed",
                  type: "slider",
                  unit: "%",
                },
              },
              title: "Animation",
            },
          ],
          title: "Controls",
        },
        timeline: undefined,
      },
    } as const;

    expect(
      validateContractAcceptanceDiagnostics({
        schema: schemaWithAnimationControls,
        acceptance: [
          makeControlAcceptance("animation.speed", "slider"),
        ],
      }),
    ).toEqual(expect.arrayContaining([
      expect.objectContaining({
        message:
          'Animation controls "Animation / speed" (animation.speed) exist while panels.timeline is omitted. Use panels.timeline mode "playback" for product animation transport, mode "keyframes" for editable keyframes, or declare appTransferMode.animationIntent mode "autonomous" with coverage proving there is no user-facing transport.',
        ruleId: "timeline-mode-choice",
        severity: "warning",
      }),
    ]));
  });

  it("accepts explicit autonomous animation intent for decorative self-running output", () => {
    const schemaWithAutonomousAnimation = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
        upload: true,
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                shimmer: {
                  defaultValue: 40,
                  label: "Shimmer",
                  max: 100,
                  min: 0,
                  orderRole: "detail",
                  target: "animation.shimmer",
                  type: "slider",
                  unit: "%",
                },
              },
              title: "Animation",
            },
          ],
          title: "Controls",
        },
        timeline: undefined,
      },
      toolbar: {
        history: true,
        radar: true,
        zoom: true,
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithAutonomousAnimation,
        acceptance: [makeControlAcceptance("animation.shimmer", "slider")],
        transferMode: {
          animationIntent: {
            behaviorCoverage: [
              "no-user-facing-transport",
              "no-play-pause",
              "no-scrub",
              "no-duration-control",
              "no-loop-control",
              "no-export-at-time",
            ],
            mode: "autonomous",
            reason: "The shimmer is decorative self-running output and does not expose product time transport.",
          },
          mode: "new-toolcraft-app",
        },
      }),
    ).toEqual([]);
  });

  it("requires a top timeline when video export exists", () => {
    const schemaWithVideoExportWithoutTimeline = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeVideoExportSection(),
            {
              actionGroup: "secondary",
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "upload-simple",
                      label: "Export Video",
                      role: "export-video",
                      value: "export.video",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Export",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(validateContractAcceptance({
      schema: schemaWithVideoExportWithoutTimeline,
    })).toContain(
      'Apps with Export Video must enable the top Toolcraft timeline. Use panels.timeline mode "playback" for product animation transport, or mode "keyframes" when exported animation is driven by keyframes; autonomous no-timeline animation is only allowed when there is no video export.',
    );
  });

  it("rejects autonomous animation intent when video export exists", () => {
    const schemaWithAutonomousVideoExport = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeVideoExportSection(),
            {
              actionGroup: "secondary",
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "upload-simple",
                      label: "Export Video",
                      role: "export-video",
                      value: "export.video",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Export",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithAutonomousVideoExport,
        acceptance: [],
        transferMode: {
          animationIntent: {
            behaviorCoverage: [
              "no-user-facing-transport",
              "no-play-pause",
              "no-scrub",
              "no-duration-control",
              "no-loop-control",
              "no-export-at-time",
            ],
            mode: "autonomous",
            reason: "The shader is decorative self-running output with no transport controls.",
          },
          mode: "new-toolcraft-app",
        },
      }),
    ).toContain(
      'appTransferMode.animationIntent mode "autonomous" conflicts with Export Video. Video export creates product-time behavior, so the renderer and export must use the top Toolcraft timeline duration, loop, and deterministic timestamps.',
    );
  });

  it("rejects timeline animation intent when the timeline mode does not match", () => {
    const schemaWithPlaybackTimeline = {
      ...contractSchemaFixture,
      panels: {
        ...contractSchemaFixture.panels,
        timeline: { defaultDurationSeconds: 8, enabled: true, mode: "playback" as const },
      },
    };

    expect(
      validateContractAcceptance({
        schema: schemaWithPlaybackTimeline,
        acceptance: [playbackTimelineAcceptance],
        transferMode: {
          animationIntent: {
            loopDuration: productDerivedEightSecondLoop,
            mode: "timeline-keyframes",
          },
          mode: "new-toolcraft-app",
        },
      }),
    ).toContain(
      'appTransferMode.animationIntent mode "timeline-keyframes" requires panels.timeline mode "keyframes".',
    );
  });
});
