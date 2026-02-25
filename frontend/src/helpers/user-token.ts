export const setUserToken = (token: string): void => { localStorage.setItem('token', token); };
export const getUserToken = (): string | null => { return localStorage.getItem('token'); };
export const clearUserToken = (): void => { localStorage.removeItem('token'); };
