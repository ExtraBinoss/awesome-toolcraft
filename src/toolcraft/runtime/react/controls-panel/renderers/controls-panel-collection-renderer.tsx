import * as React from "react";
import {
  Checkbox,
  CollectionActions,
  Color,
  ColorOpacity,
  FontPicker,
  RangeInput,
  Segmented,
  Select,
  Slider,
  Switch,
  TextInput,
  type ControlChangeMeta,
} from "@/toolcraft/ui";

import type { ToolcraftControlSchema } from "../../../schema/types";
import {
  asBoolean,
  asColorOpacityValue,
  asColorValue,
  asCollectionItems,
  asFontPickerValue,
  asNumber,
  asRangeInputValue,
  asString,
  getCollectionHardMaxItems,
  getCollectionItemBaseLabel,
  getCollectionItemDefaultValue,
  getCollectionItemName,
  getCollectionItemType,
  getCollectionMinItems,
} from "../values/controls-panel-values";

export type CollectionControlSetValue = (
  target: string,
  value: unknown,
  label?: string,
  meta?: ControlChangeMeta,
) => void;

export type CollectionActionsControlRenderArgs = {
  control: ToolcraftControlSchema;
  name: string;
  setControlValue: CollectionControlSetValue;
  value: unknown;
};

export function renderCollectionActionsControl({
  control,
  name,
  setControlValue,
  value,
}: CollectionActionsControlRenderArgs): React.JSX.Element {
  const items = asCollectionItems(value, control.defaultValue);
  const minItems = getCollectionMinItems(control);
  const hardMaxItems = getCollectionHardMaxItems(control);
  const canAdd = hardMaxItems === null || items.length < hardMaxItems;
  const canRemove = items.length > minItems;
  const itemType = getCollectionItemType(control);

  function setItems(nextItems: unknown[], label: string): void {
    setControlValue(control.target, nextItems, label);
  }

  function addItem(): void {
    if (!canAdd) {
      return;
    }

    setItems([...items, getCollectionItemDefaultValue(control)], control.addLabel ?? "Add item");
  }

  function removeItem(): void {
    if (!canRemove) {
      return;
    }

    setItems(items.slice(0, -1), control.removeLabel ?? "Remove item");
  }

  function updateItem(index: number, nextValue: unknown, meta?: ControlChangeMeta): void {
    const nextItems = items.map((item, itemIndex) =>
      itemIndex === index ? nextValue : item,
    );
    const itemName = getCollectionItemName(control, index) || name;

    setControlValue(control.target, nextItems, itemName, meta);
  }

  function renderColorItems(): React.ReactNode {
    return (
      <div
        className="grid min-w-0 grid-cols-2 gap-x-2 gap-y-4"
        data-slot="collection-actions-items-grid"
      >
        {items.map((item, index) => {
          const itemName = getCollectionItemName(control, index);

          return (
            <Color
              hex={asColorValue(item).hex}
              key={itemName || index}
              name={itemName}
              onValueChange={(nextValue: { hex: string }, meta?: ControlChangeMeta) =>
                updateItem(index, nextValue, meta)
              }
              showLabel={false}
            />
          );
        })}
      </div>
    );
  }

  function renderColorOpacityItems(): React.ReactNode {
    return items.map((item, index) => {
      const colorOpacityValue = asColorOpacityValue(item);
      const itemName = getCollectionItemName(control, index);

      return (
        <ColorOpacity
          hex={colorOpacityValue.hex}
          key={itemName || index}
          name={itemName}
          onValueChange={(nextValue, meta) => updateItem(index, nextValue, meta)}
          opacity={colorOpacityValue.opacity}
          showLabel={false}
        />
      );
    });
  }

  function renderStackedItemControl(item: unknown, index: number): React.ReactNode {
    const itemControl = control.itemControl;
    const itemName = getCollectionItemName(control, index);
    const key = `${itemName || "item"}-${index}`;
    const update = (nextValue: unknown, meta?: ControlChangeMeta) => {
      updateItem(index, nextValue, meta);
    };

    switch (itemType) {
      case "checkbox":
        return (
          <Checkbox
            checked={asBoolean(item)}
            key={key}
            name={itemName}
            onCheckedChange={update}
            showLabel={itemControl?.label !== false}
          />
        );
      case "rangeInput": {
        const rangeValue = asRangeInputValue(item);

        return (
          <RangeInput
            defaultValue={asRangeInputValue(itemControl?.defaultValue)}
            end={rangeValue.end}
            key={key}
            name={itemName}
            onValueChange={update}
            start={rangeValue.start}
          />
        );
      }
      case "segmented":
        return (
          <Segmented
            key={key}
            name={itemName}
            onValueChange={update}
            options={itemControl?.options ?? []}
            value={asString(item, itemControl?.options?.[0]?.value ?? "")}
            variant={itemControl?.variant === "dots" ? "dots" : "default"}
          />
        );
      case "select":
        return (
          <Select
            key={key}
            name={itemName}
            onValueChange={update}
            options={itemControl?.options ?? []}
            value={asString(item, itemControl?.options?.[0]?.value ?? "")}
          />
        );
      case "slider":
        return (
          <Slider
            baseValue={asNumber(
              itemControl?.defaultValue,
              itemControl?.min ?? 0,
            )}
            key={key}
            markerCount={
              typeof itemControl?.markerCount === "number"
                ? itemControl.markerCount
                : undefined
            }
            max={itemControl?.max ?? 100}
            min={itemControl?.min ?? 0}
            name={itemName}
            onValueChange={update}
            step={itemControl?.step ?? 1}
            unit={itemControl?.unit}
            value={asNumber(
              item,
              asNumber(itemControl?.defaultValue, itemControl?.min ?? 0),
            )}
            variant={itemControl?.variant === "discrete" ? "discrete" : "continuous"}
          />
        );
      case "switch":
        return (
          <Switch
            checked={asBoolean(item)}
            key={key}
            name={itemName}
            onCheckedChange={update}
            showLabel={itemControl?.label !== false}
          />
        );
      case "fontPicker":
        return (
          <FontPicker
            defaultValue={asFontPickerValue(itemControl?.defaultValue)}
            key={key}
            name={itemName || "Font"}
            onValueChange={update}
            value={asFontPickerValue(item)}
          />
        );
      case "text":
        return (
          <TextInput
            commitOnBlur={itemControl?.commitMode === "setting"}
            defaultValue={asString(itemControl?.defaultValue, asString(item))}
            key={key}
            name={itemName}
            onValueChange={update}
            value={asString(item)}
          />
        );
      default:
        return (
          <TextInput
            defaultValue={asString(itemControl?.defaultValue, asString(item))}
            key={key}
            name={itemName}
            onValueChange={update}
            value={asString(item)}
          />
        );
    }
  }

  function renderCollectionItems(): React.ReactNode {
    if (itemType === "color") {
      return renderColorItems();
    }

    if (itemType === "colorOpacity") {
      return renderColorOpacityItems();
    }

    return items.map(renderStackedItemControl);
  }

  return (
    <div className="min-w-0 space-y-3" data-slot="collection-actions-control">
      <CollectionActions
        addLabel={control.addLabel ?? `Add ${getCollectionItemBaseLabel(control)}`}
        canAdd={canAdd}
        canRemove={canRemove}
        name={name}
        onAdd={addItem}
        onRemove={removeItem}
        removeLabel={control.removeLabel ?? `Remove ${getCollectionItemBaseLabel(control)}`}
      />
      <div className="min-w-0 space-y-4" data-slot="collection-actions-items">
        {renderCollectionItems()}
      </div>
    </div>
  );
}
