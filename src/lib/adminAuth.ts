// Admin authentication utility
// Stores admin auth status in localStorage

const ADMIN_PASSWORD = 'Proksi123';
const ADMIN_AUTH_KEY = 'image_labeler_admin_auth';

export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function setAdminAuth(authenticated: boolean): void {
  if (typeof window === 'undefined') return;
  if (authenticated) {
    localStorage.setItem(ADMIN_AUTH_KEY, 'true');
  } else {
    localStorage.removeItem(ADMIN_AUTH_KEY);
  }
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

export function logoutAdmin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_AUTH_KEY);
}
