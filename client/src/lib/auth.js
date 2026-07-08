const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const AUTH_KEY = 'gamefield_auth';

/**
 * Login with username + password.
 * Returns { token, role, username } on success, throws on failure.
 */
export async function login(username, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  // Persist to localStorage
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  return data;
}

/**
 * Clear auth from localStorage (logout).
 */
export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

/**
 * Get current auth state from localStorage.
 * Returns { token, role, username } or null.
 */
export function getAuthState() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Returns Authorization header object for authenticated requests.
 */
export function authHeaders() {
  const auth = getAuthState();
  if (!auth?.token) return {};
  return { Authorization: `Bearer ${auth.token}` };
}
