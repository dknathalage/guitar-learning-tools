const STORE_PREFIX = 'gl_learn_';

export class LocalStorageAdapter {
  getItem(exerciseId) {
    return localStorage.getItem(STORE_PREFIX + exerciseId);
  }

  setItem(exerciseId, value) {
    localStorage.setItem(STORE_PREFIX + exerciseId, value);
  }

  removeItem(exerciseId) {
    localStorage.removeItem(STORE_PREFIX + exerciseId);
  }
}

export class InMemoryStorageAdapter {
  constructor() {
    this.store = new Map();
  }

  getItem(exerciseId) {
    return this.store.get(exerciseId) ?? null;
  }

  setItem(exerciseId, value) {
    this.store.set(exerciseId, value);
  }

  removeItem(exerciseId) {
    this.store.delete(exerciseId);
  }
}
