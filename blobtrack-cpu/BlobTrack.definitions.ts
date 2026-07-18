import type { RuntimePropertyMap } from "@spidd/schema";
import { rgba, type RgbaColor } from "../../../color";
import { booleanProperty, colorProperty, numberProperty, stringProperty } from "../../EffectPass";

export const BLOB_TRACK_BASE_WIDTH = 320;
export const BLOB_TRACK_BASE_HEIGHT = 180;

export interface BlobTrackConfig {
  view: string;
  maskMode: string;
  edgeSource: string;
  keyColor: string;
  threshold: number;
  softness: number;
  blur: number;
  edgeAmount: number;
  edgeGain: number;
  keyTolerance: number;
  backgroundGain: number;
  minArea: number;
  maxArea: number;
  maxBlobs: number;
  readEvery: number;
  motionSmoothing: number;
  matchDistance: number;
  outlineColor: string;
  trailColor: string;
  thickness: number;
  lineDistance: number;
  curve: number;
  brackets: boolean;
  connections: boolean;
  trails: boolean;
  centerDots: boolean;
  showIds: boolean;
  showMetrics: boolean;
  mix: number;
  resolutionScale: number;
}

export function readBlobTrackConfig(properties: RuntimePropertyMap): BlobTrackConfig {
  return {
    view: stringProperty(properties, "view", "final"),
    maskMode: stringProperty(properties, "maskMode", "luma"),
    edgeSource: stringProperty(properties, "edgeSource", "mask"),
    keyColor: colorToCss(colorProperty(properties, "keyColor", rgba(1, 0.2, 0.333, 1))),
    threshold: numberProperty(properties, "threshold", 0.5),
    softness: numberProperty(properties, "softness", 0.045),
    blur: numberProperty(properties, "blur", 1),
    edgeAmount: numberProperty(properties, "edgeAmount", 0.12),
    edgeGain: numberProperty(properties, "edgeGain", 4),
    keyTolerance: numberProperty(properties, "keyTolerance", 0.32),
    backgroundGain: numberProperty(properties, "backgroundGain", 3),
    minArea: numberProperty(properties, "minArea", 10),
    maxArea: numberProperty(properties, "maxArea", 1800),
    maxBlobs: numberProperty(properties, "maxBlobs", 50),
    readEvery: Math.max(1, Math.round(numberProperty(properties, "readEvery", 2))),
    resolutionScale: numberProperty(properties, "resolutionScale", 1),
    motionSmoothing: numberProperty(properties, "motionSmoothing", 0.35),
    matchDistance: numberProperty(properties, "matchDistance", 70),
    outlineColor: colorToCss(colorProperty(properties, "outlineColor", rgba(0, 0, 0, 1))),
    trailColor: colorToCss(colorProperty(properties, "trailColor", rgba(0, 0, 0, 1))),
    thickness: numberProperty(properties, "thickness", 2),
    lineDistance: numberProperty(properties, "lineDistance", 90),
    curve: numberProperty(properties, "curve", 0.12),
    brackets: booleanProperty(properties, "brackets", true),
    connections: booleanProperty(properties, "connections", true),
    trails: booleanProperty(properties, "trails", true),
    centerDots: booleanProperty(properties, "centerDots", true),
    showIds: booleanProperty(properties, "showIds", false),
    showMetrics: booleanProperty(properties, "showMetrics", false),
    mix: numberProperty(properties, "mix", 1),
  };
}

export function colorToCss(color: RgbaColor): string {
  return `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${color.a})`;
}
