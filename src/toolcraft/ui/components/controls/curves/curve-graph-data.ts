import type { CurveChannel } from "../control-types";
import { channelMeta } from "../channel-tabs";

export const curveChannels = ["RGB", "R", "G", "B"] as const satisfies readonly CurveChannel[];
export const singleCurveChannels = ["RGB"] as const satisfies readonly CurveChannel[];
export { channelMeta };
