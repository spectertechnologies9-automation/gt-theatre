// Public files live under Vite's base path ('/' locally, '/gt-theatre/' on GitHub Pages).
export const BASE = import.meta.env.BASE_URL
export const asset = (path: string) => BASE + path.replace(/^\//, '')
