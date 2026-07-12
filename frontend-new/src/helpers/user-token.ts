import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'token';

export const setUserToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};
export const getUserToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const clearUserToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const NAMEID_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

type JwtClaims = Record<string, unknown>;

export const decodeRoleFromToken = (token: string): string | null => {
  try {
    const payload = jwtDecode<JwtClaims>(token);
    const role = payload[ROLE_CLAIM];
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
};

export const decodeUserIdFromToken = (token: string): number | null => {
  try {
    const payload = jwtDecode<JwtClaims>(token);
    const raw = payload[NAMEID_CLAIM];
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};
