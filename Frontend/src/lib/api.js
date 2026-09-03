// Single source of truth for the backend base URL. In local dev this falls
// back to localhost:5000 (the default `npm run dev` port); in any deployed
// environment VITE_API_BASE_URL must be set (e.g. to a Render URL) or every
// request would otherwise try to reach the visitor's own machine.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
