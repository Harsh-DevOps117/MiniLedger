export type Clock = () => Date;
export const systemClock: Clock = () => new Date();
export function utcToday(clock: Clock): string {
  return clock().toISOString().slice(0, 10);
}
