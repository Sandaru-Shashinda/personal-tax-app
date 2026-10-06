/** Round to cents, half away from zero, without binary-float drift on values like 1.005. */
export function round2(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
}

export function sum(values: number[]): number {
  return round2(values.reduce((total, v) => total + v, 0));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
