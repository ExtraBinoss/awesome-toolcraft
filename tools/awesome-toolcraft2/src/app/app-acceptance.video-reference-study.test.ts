import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import type {
  ToolcraftComponentAcceptance,
  ToolcraftVideoReferenceStudyEvidence,
} from "./acceptance/types";
import {
  contractSchemaFixture,
  validateContractAcceptance,
} from "./app-acceptance.contract-fixtures";
import {
  playbackTimelineAcceptance,
} from "./app-acceptance.timeline-test-utils";

const videoReferenceMotionAcceptance: ToolcraftComponentAcceptance = {
  automated: true,
  automatedTestName: "video reference motion matches frame delta study",
  browser: true,
  browserTestName: "browser: video reference motion matches frame delta study",
  componentType: "custom-renderer",
  evidence: "product-output",
  expectedObservable:
    "The renderer preserves the video reference behavior observed across the storyboard transitions.",
  fixture: "video reference storyboard fixture",
  id: "reference.video.motion",
  kind: "runtime",
  target: "reference.video.motion",
  userAction:
    "Compare the implemented renderer against the storyboard frames and frame-to-frame behavior deltas.",
};

const videoReferenceStudyEvidence = {
  acceptanceMapping: [
    {
      acceptanceId: "reference.video.motion",
      behavior: "Planted contact points stretch across adjacent frames before retargeting.",
      frameIds: ["f000", "f012", "f024"],
    },
  ],
  behaviorDecomposition:
    "The video reference is decomposed into body movement, persistent contact points, delayed release, and retargeted anchors. The implementation copies those behaviors rather than a single static frame.",
  extractionEvidence:
    "Extracted frames with ffmpeg and reviewed contact sheets before implementation.",
  referenceLocation: "/fixtures/reference-motion/ref.mp4",
  storyboard: [
    {
      behaviorObservation:
        "Body starts moving while several endpoints remain planted in canvas space.",
      frameId: "f000",
      frameSource: "frames/frame_000.png",
      timeSeconds: 0,
      visualObservation: "The body is near the left side with legs extended outward.",
    },
    {
      behaviorObservation:
        "Body advances and planted endpoints stretch instead of following immediately.",
      frameId: "f012",
      frameSource: "frames/frame_012.png",
      timeSeconds: 0.2,
      visualObservation: "Several endpoints stay near the earlier canvas positions.",
    },
    {
      behaviorObservation:
        "Over-extended legs begin to release and choose new anchors.",
      frameId: "f024",
      frameSource: "frames/frame_024.png",
      timeSeconds: 0.4,
      visualObservation: "One side shows a retargeted leg group closer to the body.",
    },
    {
      behaviorObservation:
        "The new anchor pattern stabilizes before the next release.",
      frameId: "f036",
      frameSource: "frames/frame_036.png",
      timeSeconds: 0.6,
      visualObservation: "Legs settle into a new spread with the body further right.",
    },
  ],
  transitionAnalysis: [
    {
      behaviorDelta:
        "Between f000 and f012, body position changes faster than several leg endpoints, proving contact memory.",
      fromFrameId: "f000",
      id: "f000-f012",
      toFrameId: "f012",
    },
    {
      behaviorDelta:
        "Between f012 and f024, over-extension triggers release and retargeting instead of continuous sine motion.",
      fromFrameId: "f012",
      id: "f012-f024",
      toFrameId: "f024",
    },
    {
      behaviorDelta:
        "Between f024 and f036, newly planted anchors remain stable while the body keeps moving.",
      fromFrameId: "f024",
      id: "f024-f036",
      toFrameId: "f036",
    },
  ],
} satisfies ToolcraftVideoReferenceStudyEvidence;

function createPlaybackTimelineSchema(durationSeconds = 5.8) {
  return {
    ...contractSchemaFixture,
    panels: {
      ...contractSchemaFixture.panels,
      timeline: {
        defaultDurationSeconds: durationSeconds,
        enabled: true,
        mode: "playback" as const,
      },
    },
  };
}

describe("starter acceptance video reference study contract", () => {
  it("requires video reference study when a new app cites video reference evidence", () => {
    expect(
      validateContractAcceptance({
        schema: createPlaybackTimelineSchema(),
        acceptance: [playbackTimelineAcceptance],
        transferMode: {
          animationIntent: {
            loopDuration: {
              evidence: "The source reference video /fixtures/reference-motion/ref.mp4 was inspected for motion behavior.",
              seconds: 5.8,
              source: "reference",
            },
            mode: "timeline-playback",
          },
          mode: "new-toolcraft-app",
        },
      }),
    ).toContain(
      "appTransferMode cites a video reference, screen recording, GIF, extracted frames, or contact sheet; declare videoReferenceStudy with storyboard frames, frame-to-frame transition analysis, behavior decomposition, and acceptance mapping before implementation.",
    );
  });

  it("does not require video reference study for ordinary video export intent", () => {
    const schemaWithPlaybackTimeline = defineToolcraft({
      canvas: {
        enabled: true,
        upload: true,
      },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
        timeline: { defaultDurationSeconds: 6, enabled: true, mode: "playback" as const },
      },
      toolbar: {
        history: true,
        radar: true,
        zoom: true,
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithPlaybackTimeline,
        acceptance: [playbackTimelineAcceptance],
        transferMode: {
          animationIntent: {
            loopDuration: {
              evidence: "The product timing model derives a six second cycle for exported video output.",
              seconds: 6,
              source: "product-derived",
            },
            mode: "timeline-playback",
          },
          mode: "new-toolcraft-app",
        },
      }),
    ).toEqual([]);
  });

  it("accepts a new app video reference only with storyboard and transition acceptance mapping", () => {
    const schemaWithPlaybackTimeline = defineToolcraft({
      canvas: {
        enabled: true,
        upload: true,
      },
      panels: {
        controls: {
          sections: [],
          title: "Controls",
        },
        timeline: { defaultDurationSeconds: 5.8, enabled: true, mode: "playback" as const },
      },
      toolbar: {
        history: true,
        radar: true,
        zoom: true,
      },
    });

    expect(
      validateContractAcceptance({
        schema: schemaWithPlaybackTimeline,
        acceptance: [playbackTimelineAcceptance, videoReferenceMotionAcceptance],
        transferMode: {
          animationIntent: {
            loopDuration: {
              evidence: "The source reference timing comes from the inspected motion reference asset.",
              seconds: 5.8,
              source: "reference",
            },
            mode: "timeline-playback",
          },
          mode: "new-toolcraft-app",
          videoReferenceStudy: videoReferenceStudyEvidence,
        },
      }),
    ).toEqual([]);
  });

  it("rejects incomplete video reference studies", () => {
    expect(
      validateContractAcceptance({
        schema: contractSchemaFixture,
        acceptance: [],
        transferMode: {
          mode: "new-toolcraft-app",
          videoReferenceStudy: {
            acceptanceMapping: [
              {
                acceptanceId: "missing.acceptance",
                behavior: "Motion behavior",
                frameIds: ["f001"],
              },
            ],
            behaviorDecomposition: "",
            extractionEvidence: "",
            referenceLocation: "/fixtures/reference-motion/ref.mp4",
            storyboard: [
              {
                behaviorObservation: "Only one frame was inspected.",
                frameId: "f001",
                frameSource: "frames/frame_001.png",
                timeSeconds: 0,
                visualObservation: "A single static state.",
              },
            ],
            transitionAnalysis: [],
          },
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "videoReferenceStudy.extractionEvidence must explain how frames were inspected or extracted before implementation.",
        "videoReferenceStudy.behaviorDecomposition must decompose the observed frame-to-frame changes into product behavior to preserve.",
        "videoReferenceStudy.storyboard must include at least four timecoded frames so the reference is studied as motion, not a single screenshot.",
        "videoReferenceStudy.transitionAnalysis must include at least three frame-to-frame deltas proving how behavior changes between sampled frames.",
        'videoReferenceStudy.acceptanceMapping "Motion behavior" points to missing acceptanceId "missing.acceptance".',
      ]),
    );
  });
});
