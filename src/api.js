const isBrowser = typeof window !== 'undefined';
const isLocalHost = isBrowser && ['localhost', '127.0.0.1'].includes(window.location.hostname);

// VITE_API_BASE_URL must be set in Render frontend environment variables.
// Example: https://nlm-backend.onrender.com
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') || '';

function normalizeLocalApiBaseUrl(baseUrl) {
  if (!baseUrl || !isLocalHost) {
    return baseUrl;
  }

  return baseUrl.replace('://localhost:', '://127.0.0.1:');
}

export const API_BASE_URL = normalizeLocalApiBaseUrl(
  configuredApiBaseUrl || (isLocalHost ? 'http://127.0.0.1:8000' : 'https://ai-lms-a9f4.onrender.com')
);

// Log a warning in development if the URL is missing
if (isBrowser && !isLocalHost && !API_BASE_URL) {
  console.error(
    '[LMS] VITE_API_BASE_URL is not set! ' +
    'Go to Render Dashboard → nlm-frontend → Environment → Add VITE_API_BASE_URL=https://your-backend.onrender.com ' +
    'then redeploy the frontend.'
  );
}

export function getApiConfigurationError() {
  if (!API_BASE_URL && isBrowser && !isLocalHost) {
    return 'Backend API is not configured. Please contact support or check VITE_API_BASE_URL environment variable.';
  }

  return '';
}

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
