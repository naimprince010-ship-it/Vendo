const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;
const MULTIPLIER = { s: 1, m: 60, h: 3600, d: 86400 } as const;

export function durationSeconds(value: string): number {
  const match = DURATION_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const amount = Number(match[1]);
  const seconds = amount * MULTIPLIER[match[2] as keyof typeof MULTIPLIER];
  if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new Error(`Invalid duration: ${value}`);
  return seconds;
}
