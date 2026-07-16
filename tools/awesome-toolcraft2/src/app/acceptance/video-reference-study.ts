import type {
  ToolcraftComponentAcceptance,
  ToolcraftTransferMode,
  ToolcraftVideoReferenceStudyEvidence,
} from "./types";

export const videoReferenceEvidencePattern =
  /\b(?:reference\s+(?:video|gif)|screen\s*recording|contact[-\s]*sheet|storyboard|frame[-\s]*by[-\s]*frame|extracted[-\s]*frames?|ffprobe)\b|(?:^|[\\/"'\s])[^\\/"'\s]+\.(?:mp4|mov|webm|gif)\b/i;

function getToolcraftTransferModeEvidenceText(
  transferMode: ToolcraftTransferMode,
): string {
  return JSON.stringify(transferMode);
}

export function getToolcraftVideoReferenceStudyErrors({
  acceptance,
  transferMode,
}: {
  acceptance: readonly ToolcraftComponentAcceptance[];
  transferMode: ToolcraftTransferMode;
}): string[] {
  const errors: string[] = [];
  const transferModeEvidenceText = getToolcraftTransferModeEvidenceText(transferMode);

  if (
    videoReferenceEvidencePattern.test(transferModeEvidenceText) &&
    !transferMode.videoReferenceStudy
  ) {
    errors.push(
      "appTransferMode cites a video reference, screen recording, GIF, extracted frames, or contact sheet; declare videoReferenceStudy with storyboard frames, frame-to-frame transition analysis, behavior decomposition, and acceptance mapping before implementation.",
    );
  }

  if (transferMode.videoReferenceStudy) {
    errors.push(
      ...validateToolcraftVideoReferenceStudy(
        transferMode.videoReferenceStudy,
        acceptance,
      ),
    );
  }

  return errors;
}

export function validateToolcraftVideoReferenceStudy(
  study: ToolcraftVideoReferenceStudyEvidence,
  acceptance: readonly ToolcraftComponentAcceptance[],
): string[] {
  const errors: string[] = [];
  const acceptanceById = new Map(acceptance.map((entry) => [entry.id, entry]));
  const frameIds = new Set<string>();

  if (!study.referenceLocation.trim()) {
    errors.push(
      "videoReferenceStudy.referenceLocation must name the inspected video, GIF, screen recording, contact sheet, or extracted-frame folder.",
    );
  }

  if (!study.extractionEvidence.trim()) {
    errors.push(
      "videoReferenceStudy.extractionEvidence must explain how frames were inspected or extracted before implementation.",
    );
  }

  if (!study.behaviorDecomposition.trim()) {
    errors.push(
      "videoReferenceStudy.behaviorDecomposition must decompose the observed frame-to-frame changes into product behavior to preserve.",
    );
  }

  if (study.storyboard.length < 4) {
    errors.push(
      "videoReferenceStudy.storyboard must include at least four timecoded frames so the reference is studied as motion, not a single screenshot.",
    );
  }

  for (const [index, frame] of study.storyboard.entries()) {
    const frameLabel = frame.frameId.trim() || `#${index + 1}`;

    if (!frame.frameId.trim()) {
      errors.push(`videoReferenceStudy.storyboard frame ${index + 1} must include a stable frameId.`);
    } else if (frameIds.has(frame.frameId)) {
      errors.push(
        `videoReferenceStudy.storyboard frameId "${frame.frameId}" is duplicated; each sampled frame needs a stable id.`,
      );
    } else {
      frameIds.add(frame.frameId);
    }

    if (!Number.isFinite(frame.timeSeconds) || frame.timeSeconds < 0) {
      errors.push(
        `videoReferenceStudy.storyboard "${frameLabel}" must include a non-negative finite timeSeconds value.`,
      );
    }

    if (!frame.frameSource.trim()) {
      errors.push(
        `videoReferenceStudy.storyboard "${frameLabel}" must cite the frame image, contact sheet cell, or source timecode inspected.`,
      );
    }

    if (!frame.visualObservation.trim()) {
      errors.push(
        `videoReferenceStudy.storyboard "${frameLabel}" must describe the visible frame state.`,
      );
    }

    if (!frame.behaviorObservation.trim()) {
      errors.push(
        `videoReferenceStudy.storyboard "${frameLabel}" must describe the behavior inferred from that frame.`,
      );
    }
  }

  if (study.transitionAnalysis.length < 3) {
    errors.push(
      "videoReferenceStudy.transitionAnalysis must include at least three frame-to-frame deltas proving how behavior changes between sampled frames.",
    );
  }

  for (const [index, transition] of study.transitionAnalysis.entries()) {
    const transitionLabel = transition.id.trim() || `#${index + 1}`;

    if (!transition.id.trim()) {
      errors.push(
        `videoReferenceStudy.transitionAnalysis item ${index + 1} must include a stable id.`,
      );
    }

    if (!frameIds.has(transition.fromFrameId)) {
      errors.push(
        `videoReferenceStudy.transitionAnalysis "${transitionLabel}" fromFrameId "${transition.fromFrameId}" must point to a storyboard frameId.`,
      );
    }

    if (!frameIds.has(transition.toFrameId)) {
      errors.push(
        `videoReferenceStudy.transitionAnalysis "${transitionLabel}" toFrameId "${transition.toFrameId}" must point to a storyboard frameId.`,
      );
    }

    if (!transition.behaviorDelta.trim()) {
      errors.push(
        `videoReferenceStudy.transitionAnalysis "${transitionLabel}" must describe the behavior delta between frames.`,
      );
    }
  }

  if (study.acceptanceMapping.length === 0) {
    errors.push(
      "videoReferenceStudy.acceptanceMapping must map observed video behaviors to acceptance rows.",
    );
  }

  for (const [index, mapping] of study.acceptanceMapping.entries()) {
    const mappingLabel = mapping.behavior.trim() || `#${index + 1}`;

    if (!mapping.behavior.trim()) {
      errors.push(
        `videoReferenceStudy.acceptanceMapping item ${index + 1} must name the observed behavior.`,
      );
    }

    if (mapping.frameIds.length === 0) {
      errors.push(
        `videoReferenceStudy.acceptanceMapping "${mappingLabel}" must cite storyboard frameIds that prove the behavior.`,
      );
    }

    for (const frameId of mapping.frameIds) {
      if (!frameIds.has(frameId)) {
        errors.push(
          `videoReferenceStudy.acceptanceMapping "${mappingLabel}" frameId "${frameId}" must point to a storyboard frameId.`,
        );
      }
    }

    const acceptanceId = mapping.acceptanceId.trim();
    const entry = acceptanceById.get(acceptanceId);

    if (!acceptanceId) {
      errors.push(
        `videoReferenceStudy.acceptanceMapping "${mappingLabel}" must include acceptanceId for the test proving the copied behavior.`,
      );
      continue;
    }

    if (!entry) {
      errors.push(
        `videoReferenceStudy.acceptanceMapping "${mappingLabel}" points to missing acceptanceId "${acceptanceId}".`,
      );
      continue;
    }

    if (!entry.automated || !entry.automatedTestName.trim()) {
      errors.push(
        `${acceptanceId} must have automated coverage proving video reference behavior "${mappingLabel}".`,
      );
    }

    if (!entry.browser || !entry.browserTestName.trim()) {
      errors.push(
        `${acceptanceId} must have browser coverage proving video reference behavior "${mappingLabel}".`,
      );
    }

    if (!entry.expectedObservable.trim()) {
      errors.push(
        `${acceptanceId} must describe the observable result for video reference behavior "${mappingLabel}".`,
      );
    }
  }

  return errors;
}
