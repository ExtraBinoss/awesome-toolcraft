import type * as React from "react";

import type { CurveChannel, MixerChannel } from "../control-types";
import { SegmentedControl } from "../segmented";
import { channelMeta } from "./channel-tabs-data";

type Channel = CurveChannel | MixerChannel;

export function ChannelTabs<T extends Channel>({
  ariaLabel,
  channels,
  name,
  onValueChange,
  value,
}: {
  ariaLabel?: string;
  channels: readonly T[];
  name: string;
  onValueChange: (value: T) => void;
  value: T;
}): React.JSX.Element {
  return (
    <SegmentedControl
      ariaLabel={ariaLabel ?? name}
      name={name}
      onValueChange={(nextValue) => onValueChange(nextValue as T)}
      options={channels.map((channel) => ({
        indicatorColor: channelMeta[channel].color,
        label: channel,
        value: channel,
      }))}
      value={value}
      variant="dots"
    />
  );
}
