// A file-origin desktop parent can make localhost iframe storage unavailable.
// Initialize before the Vue module graph evaluates; project data lives in the host.
;(function () {
  if (window.parent === window) return

  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      window[name].getItem('__hyper_studio_storage_probe__')
      continue
    } catch {
      const entries = new Map()
      const memoryStorage = {
        get length() { return entries.size },
        key(index) { return [...entries.keys()][index] ?? null },
        getItem(key) { return entries.has(String(key)) ? entries.get(String(key)) : null },
        setItem(key, value) { entries.set(String(key), String(value)) },
        removeItem(key) { entries.delete(String(key)) },
        clear() { entries.clear() },
      }
      Object.defineProperty(window, name, { configurable: true, value: memoryStorage })
    }
  }
})()
