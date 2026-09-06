/** Bounded slices let qualification resume without replaying a whole campaign batch. */
function integer(value, fallback, min, max, name) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(String(value))) throw new Error(`${name} must be an integer`);
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${name} out of range`);
  return n;
}
export function campaignOptions(env = {}) {
  const from = integer(env.LEVEL_FROM, 1, 1, 12, 'LEVEL_FROM');
  const to = integer(env.LEVEL_TO, 12, 1, 12, 'LEVEL_TO');
  if (from > to) throw new Error('LEVEL_FROM must not exceed LEVEL_TO');
  const seeds = env.SEED !== undefined && env.SEED !== ''
    ? [integer(env.SEED, 73, 0, 4294967295, 'SEED')]
    : env.FULL_CAMPAIGN === '1' ? [11, 73, 509] : [73];
  return {from, to, seeds};
}
