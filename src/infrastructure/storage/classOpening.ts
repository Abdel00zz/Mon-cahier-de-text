export function latestClassOpening(...values: (string | undefined)[]): string | undefined {
  const timestamps = values.filter(value => typeof value === 'string' && value.length <= 40).map(value => Date.parse(value!)).filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : undefined;
}
