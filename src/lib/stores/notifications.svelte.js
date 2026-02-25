let nextId = 1;
let toasts = $state([]);

export function getToasts() {
  return toasts;
}

export function addToast(message, type = 'error', durationMs = 5000) {
  const id = nextId++;
  toasts.push({ id, message, type, durationMs });
  if (durationMs > 0) {
    setTimeout(() => dismissToast(id), durationMs);
  }
  return id;
}

export function dismissToast(id) {
  toasts = toasts.filter(t => t.id !== id);
}
