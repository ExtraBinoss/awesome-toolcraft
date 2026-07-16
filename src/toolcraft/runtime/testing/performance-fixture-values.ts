import type { ToolcraftPerformanceFixture } from "./performance-types";

const largeTextStressMinChars = 50_000;
const largeTextStressMinLines = 1_000;
const mediaStressMinArea = 1920 * 1080;
const mediaStressMinLongEdge = 1920;

export function hasPerformanceFixtureValue(
  fixture: ToolcraftPerformanceFixture,
): fixture is ToolcraftPerformanceFixture & { value: unknown } {
  return Object.prototype.hasOwnProperty.call(fixture, "value");
}

export function isPerformanceFixtureObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getMediaStressFixtureDimensions(
  value: unknown,
): { height: number; width: number } | null {
  if (!isPerformanceFixtureObjectValue(value)) {
    return null;
  }

  const width = Number(value.width);
  const height = Number(value.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { height, width };
}

function getTextLineCount(value: string): number {
  if (value.length === 0) {
    return 0;
  }

  return value.split(/\r\n|\r|\n/).length;
}

export function getPerformanceFixtureLargeTextValueErrors(
  scenarioId: string,
  valueLabel: string,
  value: unknown,
  options: {
    minChars?: number;
    minLines?: number;
  } = {},
): string[] {
  const errors: string[] = [];

  if (typeof value !== "string") {
    errors.push(`${scenarioId} ${valueLabel} must be a string.`);
    return errors;
  }

  const minChars = options.minChars ?? largeTextStressMinChars;
  const minLines = options.minLines ?? largeTextStressMinLines;

  if (minChars < largeTextStressMinChars) {
    errors.push(`${scenarioId} ${valueLabel}.minChars must be >= ${largeTextStressMinChars}.`);
  }

  if (minLines < largeTextStressMinLines) {
    errors.push(`${scenarioId} ${valueLabel}.minLines must be >= ${largeTextStressMinLines}.`);
  }

  if (value.length < minChars) {
    errors.push(`${scenarioId} ${valueLabel} must contain at least ${minChars} characters.`);
  }

  if (getTextLineCount(value) < minLines) {
    errors.push(`${scenarioId} ${valueLabel} must contain at least ${minLines} lines.`);
  }

  return errors;
}

export function getPerformanceFixtureMediaValueErrors(
  scenarioId: string,
  valueLabel: string,
  value: unknown,
  dimensionPurpose: string,
): string[] {
  const dimensions = getMediaStressFixtureDimensions(value);

  if (!dimensions) {
    return [
      `${scenarioId} ${valueLabel} must be an object with numeric width and height ${dimensionPurpose}.`,
    ];
  }

  if (
    Math.max(dimensions.width, dimensions.height) < mediaStressMinLongEdge ||
    dimensions.width * dimensions.height < mediaStressMinArea
  ) {
    return [
      `${scenarioId} ${valueLabel} must be at least 1920x1080-equivalent; received ${dimensions.width}x${dimensions.height}.`,
    ];
  }

  return [];
}

function getLastFixturePathSegment(path: string): string {
  return path.split(/[._-]/).filter(Boolean).at(-1) ?? path;
}

function isCustomLargeTextFixturePath(path: string): boolean {
  return /^(?:content|text|prompt|code|script|shader|template|json|css)$/i.test(
    getLastFixturePathSegment(path),
  );
}

function isCustomMediaFixturePath(path: string): boolean {
  return /(?:^|[._-])(?:media|image|video|sourceMedia|sourceImage)(?:$|[._-])/i.test(path);
}

function isCustomRenderScaleFixturePath(path: string): boolean {
  return /^(?:canvas\.)?renderScale$|(?:^|[._-])resolutionScale$/i.test(path);
}

function isCustomCountFixturePath(path: string): boolean {
  return /(?:^|[._-])(?:count|items|layers|particles|points|rows|columns|density|detail|quality|samples|iterations)(?:$|[._-])/i.test(
    path,
  );
}

export function customFixtureValueNeedsLoadProfile(value: unknown, pathPrefix = ""): boolean {
  if (!isPerformanceFixtureObjectValue(value)) {
    return false;
  }

  return Object.entries(value).some(([key, itemValue]) => {
    const itemPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (
      isCustomLargeTextFixturePath(itemPath) ||
      isCustomMediaFixturePath(itemPath) ||
      isCustomRenderScaleFixturePath(itemPath) ||
      isCustomCountFixturePath(itemPath)
    ) {
      return true;
    }

    if (typeof itemValue === "number" && Number.isFinite(itemValue)) {
      return true;
    }

    return customFixtureValueNeedsLoadProfile(itemValue, itemPath);
  });
}

function getSortedJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(getSortedJsonValue);
  }

  if (isPerformanceFixtureObjectValue(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, itemValue]) => [key, getSortedJsonValue(itemValue)]),
    );
  }

  return value;
}

export function arePerformanceFixtureValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(getSortedJsonValue(left)) === JSON.stringify(getSortedJsonValue(right));
}

export function getNumericFixtureValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getCountFixtureValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.length;
  }

  if (isPerformanceFixtureObjectValue(value)) {
    const count = Number(value.count ?? value.items ?? value.length);

    if (Number.isFinite(count)) {
      return count;
    }

    if (Array.isArray(value.items)) {
      return value.items.length;
    }
  }

  return null;
}

export function getAreaFixtureValue(value: unknown): number | null {
  const dimensions = getMediaStressFixtureDimensions(value);

  if (!dimensions) {
    return null;
  }

  return dimensions.width * dimensions.height;
}

export function getCustomPerformanceFixtureSemanticErrors(
  scenarioId: string,
  fieldName: "stressFixture" | "workloadFixture",
  value: Record<string, unknown>,
  pathPrefix = "",
): string[] {
  const errors: string[] = [];

  for (const [key, itemValue] of Object.entries(value)) {
    const itemPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    const itemLabel = `custom ${fieldName}.${itemPath}`;

    if (isCustomLargeTextFixturePath(itemPath)) {
      errors.push(
        ...getPerformanceFixtureLargeTextValueErrors(
          scenarioId,
          itemLabel,
          itemValue,
        ),
      );
      continue;
    }

    if (isCustomMediaFixturePath(itemPath)) {
      errors.push(
        ...getPerformanceFixtureMediaValueErrors(
          scenarioId,
          itemLabel,
          itemValue,
          "so browser tests can generate or load realistic media",
        ),
      );
      continue;
    }

    if (isCustomRenderScaleFixturePath(itemPath)) {
      if (
        typeof itemValue !== "number" ||
        !Number.isFinite(itemValue) ||
        itemValue <= 1
      ) {
        errors.push(
          `${scenarioId} ${itemLabel} must be a numeric Resolution scale greater than 1 so browser tests prove high-resolution backing pixels.`,
        );
      }
      continue;
    }

    if (isPerformanceFixtureObjectValue(itemValue)) {
      errors.push(
        ...getCustomPerformanceFixtureSemanticErrors(
          scenarioId,
          fieldName,
          itemValue,
          itemPath,
        ),
      );
    }
  }

  return errors;
}
