const prefix = 'coltur_simulator_';
export const storage = {
  get(key, fallback = null) { try { return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(prefix + key, JSON.stringify(value)); return true; } catch { window.dispatchEvent(new CustomEvent('storage-warning')); return false; } },
  remove(key) { try { localStorage.removeItem(prefix + key); } catch { /* Active session can still continue in memory. */ } }
};
export function getSettings() { return { sound: false, demoMode: false, ...storage.get('settings', {}) }; }
