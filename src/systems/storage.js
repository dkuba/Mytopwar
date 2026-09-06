export const SAVE_KEY = 'last-column-v2';
const finiteInt = (v, fallback, max) => Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : fallback;
export function normalizeSave(raw = {}) {
  if (!raw || typeof raw !== 'object') raw = {};
  return { version: 2, campaignComplete: raw.campaignComplete === true, highestLevel: Math.max(1, finiteInt(raw.highestLevel, 1, 12)), credits: finiteInt(raw.credits, 0, 10000000), bestWave: finiteInt(raw.bestWave, 0, 9999),
    training: finiteInt(raw.training, 0, 3), medicine: finiteInt(raw.medicine, 0, 3), sound: raw.sound !== false, quality: raw.quality === 'low' ? 'low' : 'high',
    commander: ['captain', 'medic', 'artillery'].includes(raw.commander) ? raw.commander : 'captain' };
}
export function loadSave(storage) {
  try { return normalizeSave(JSON.parse(storage.getItem(SAVE_KEY) || storage.getItem('last-column-meta') || '{}')); }
  catch { return normalizeSave(); }
}
export function persistSave(storage, value) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(normalizeSave(value))); return true; } catch { return false; }
}
export function purchase(save, item) {
  if (!['training', 'medicine'].includes(item) || save[item] >= 3) return false;
  const price = 150 * (save[item] + 1);
  if (save.credits < price) return false;
  save.credits -= price; save[item]++; return true;
}
