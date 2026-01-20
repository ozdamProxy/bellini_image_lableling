// Client-side user session management
// Generates a unique user ID for each labeler

export function getUserId(): string {
  if (typeof window === 'undefined') return '';

  const USER_ID_KEY = 'image_labeler_user_id';

  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

export function setUserName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('image_labeler_user_name', name);
}

export function getUserName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('image_labeler_user_name');
}

function generateUserId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `user_${timestamp}_${randomStr}`;
}

export function clearUserSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('image_labeler_user_id');
  localStorage.removeItem('image_labeler_user_name');
}
