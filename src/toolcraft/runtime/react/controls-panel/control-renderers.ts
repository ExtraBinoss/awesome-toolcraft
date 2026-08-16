"use client";

import type * as React from "react";
import type { ControlChangeMeta } from "@/toolcraft/ui/components/controls/control-types";

import type { ToolcraftControlSchema } from "../../schema/types";
import type { ToolcraftDispatch } from "../../state/store";

export type ToolcraftCustomControlSetValue<Value = unknown> = (
  value: Value,
  meta?: ControlChangeMeta,
) => void;

export type ToolcraftCustomControlRendererProps<Value = unknown> = {
  control: ToolcraftControlSchema;
  controlId: string;
  dispatch: ToolcraftDispatch;
  keyframeAction: React.ReactNode;
  name: string;
  setValue: ToolcraftCustomControlSetValue<Value>;
  value: Value;
};

export type ToolcraftCustomControlRenderer<Value = unknown> = (
  props: ToolcraftCustomControlRendererProps<Value>,
) => React.ReactNode;

export type ToolcraftControlRendererMap = Readonly<
  Record<string, ToolcraftCustomControlRenderer>
>;
