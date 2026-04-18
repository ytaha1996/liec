export const setUserToken = (token: string): void => { localStorage.setItem('token', token); };
export const getUserToken = (): string | null => { return localStorage.getItem('token'); };
export const clearUserToken = (): void => { localStorage.removeItem('token'); };

export const decodeRoleFromToken = (token: string): string | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || null;
  } catch { return null; }
};
