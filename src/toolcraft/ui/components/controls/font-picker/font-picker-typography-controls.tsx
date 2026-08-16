"use client";

import * as React from "react";

import { ControlFieldLabel } from "../../control-layout";
import { Input } from "../../primitives";
import type { ControlChangeMeta } from "../control-types";
import { ColorOpacityControl } from "../color";
import { StaticSelect } from "../select";
import {
  isFontPickerTextCase,
  minFontPickerFontSizePx,
  textCaseOptions,
  type FontPickerValue,
} from "./font-picker-value";

type FontPickerTypographyControlsProps = {
  disabled: boolean;
  emitChange: (nextValue: FontPickerValue, meta?: ControlChangeMeta) => void;
  fontSizeDraft: string;
  normalizedValue: FontPickerValue;
  onFontSizeDraftChange: (value: string) => void;
  commitFontSizeDraft: (nextDraft?: string) => void;
};

export function FontPickerTypographyControls({
  disabled,
  emitChange,
  fontSizeDraft,
  normalizedValue,
  onFontSizeDraftChange,
  commitFontSizeDraft,
}: FontPickerTypographyControlsProps): React.JSX.Element {
  return (
    <>
      <div
        className="grid min-w-0 grid-cols-2 gap-2"
        data-slot="font-picker-typography-controls"
      >
        <div className="min-w-0 space-y-1.5" data-slot="font-picker-size-field">
          <ControlFieldLabel>Size</ControlFieldLabel>
          <Input
            aria-label="Font size"
            className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            disabled={disabled}
            min={minFontPickerFontSizePx}
            onBlur={() => commitFontSizeDraft()}
            onChange={(event) => onFontSizeDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitFontSizeDraft(event.currentTarget.value);
                event.currentTarget.blur();
                return;
              }

              if (event.key === "Escape") {
                event.preventDefault();
                onFontSizeDraftChange(String(normalizedValue.fontSize));
                event.currentTarget.blur();
              }
            }}
            step={1}
            type="text"
            value={fontSizeDraft}
          />
        </div>
        <div
          className="min-w-0 space-y-1.5"
          data-slot="font-picker-text-case-field"
        >
          <ControlFieldLabel>Case</ControlFieldLabel>
          <StaticSelect
            ariaLabel="Text case"
            disabled={disabled}
            onValueChange={(nextTextCase) => {
              emitChange(
                {
                  ...normalizedValue,
                  textCase: isFontPickerTextCase(nextTextCase)
                    ? nextTextCase
                    : "original",
                },
                { history: "merge" },
              );
            }}
            options={textCaseOptions}
            scrollFadeValue={false}
            value={normalizedValue.textCase}
          />
        </div>
      </div>
      <div className="min-w-0" data-slot="font-picker-color-field">
        <ColorOpacityControl
          hex={normalizedValue.color}
          name="Color"
          onValueChange={(nextColor, meta) => {
            emitChange(
              {
                ...normalizedValue,
                color: nextColor.hex,
                opacity: nextColor.opacity,
              },
              meta ?? { history: "merge" },
            );
          }}
          opacity={normalizedValue.opacity}
          showLabel
        />
      </div>
    </>
  );
}
