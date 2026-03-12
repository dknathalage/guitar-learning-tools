// Progress and dark mode store backed by localStorage

function createProgressStore() {
  const STORAGE_KEY = 'guitar-guide-progress';
  const DARK_KEY = 'guitar-guide-dark';

  function loadChecks(): Record<string, boolean> {
    if (typeof localStorage === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveChecks(data: Record<string, boolean>) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function loadDark(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(DARK_KEY) === 'true';
  }

  let checks = $state<Record<string, boolean>>(loadChecks());
  let dark = $state<boolean>(loadDark());

  function toggle(id: string) {
    checks = { ...checks, [id]: !checks[id] };
    saveChecks(checks);
  }

  function toggleDark() {
    dark = !dark;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DARK_KEY, String(dark));
    }
  }

  function isChecked(id: string): boolean {
    return !!checks[id];
  }

  return {
    get dark() { return dark; },
    get checks() { return checks; },
    toggle,
    toggleDark,
    isChecked,
  };
}

export const progress = createProgressStore();
