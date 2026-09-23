export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeDraft<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignora falha de storage (modo privado, quota cheia, etc.)
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignora
  }
}
