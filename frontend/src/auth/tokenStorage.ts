const ACCESS_TOKEN_KEY = 'ai_sales_assistant_access_token';

export function getAccessToken() {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string) {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    return undefined;
  }
}

export function clearAccessToken() {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    return undefined;
  }
}
