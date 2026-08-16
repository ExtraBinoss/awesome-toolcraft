export function getNumericValueLabelWidthReference(
  valueLabel: string,
  { max = 100, min = 0 }: { max?: number; min?: number },
): string | undefined {
  const numericMatches = Array.from(valueLabel.matchAll(/-?\d+(?:\.\d+)?/g));

  if (numericMatches.length === 0) {
    return undefined;
  }

  const decimalPrecision = Math.max(
    ...numericMatches.map((match) => match[0].split(".")[1]?.length ?? 0),
  );
  const formatEndpoint = (value: number): string =>
    decimalPrecision > 0 ? value.toFixed(decimalPrecision) : `${Math.round(value)}`;
  const widestEndpoint = [min, max]
    .map(formatEndpoint)
    .sort((left, right) => right.length - left.length)[0];

  return valueLabel.replaceAll(/-?\d+(?:\.\d+)?/g, widestEndpoint ?? "");
}
