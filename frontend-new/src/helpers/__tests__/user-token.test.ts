import { describe, it, expect, beforeEach } from 'vitest';
import {
  setUserToken, getUserToken, clearUserToken,
  decodeRoleFromToken, decodeUserIdFromToken, isTokenExpired,
} from '../user-token';

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const NAMEID_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

/** An unsigned JWT with the given payload — enough for a decoder to read. */
function jwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.`;
}

const inSeconds = (offset: number) => Math.floor(Date.now() / 1000) + offset;

beforeEach(() => localStorage.clear());

describe('token storage', () => {
  it('round-trips a token', () => {
    setUserToken('abc');
    expect(getUserToken()).toBe('abc');
  });

  it('reads back null when nothing is stored', () => {
    expect(getUserToken()).toBeNull();
  });

  it('clears it on sign-out', () => {
    setUserToken('abc');
    clearUserToken();
    expect(getUserToken()).toBeNull();
  });
});

describe('reading the claims', () => {
  it('pulls the role out of the ASP.NET claim', () => {
    expect(decodeRoleFromToken(jwt({ [ROLE_CLAIM]: 'Accountant' }))).toBe('Accountant');
  });

  it('pulls the user id out and returns it as a number', () => {
    expect(decodeUserIdFromToken(jwt({ [NAMEID_CLAIM]: '7' }))).toBe(7);
  });

  it('returns null rather than a guess when the claim is absent', () => {
    // A missing role must not silently become a privileged one.
    expect(decodeRoleFromToken(jwt({ sub: 'nobody' }))).toBeNull();
    expect(decodeUserIdFromToken(jwt({ sub: 'nobody' }))).toBeNull();
  });

  it('returns null on a token it cannot read at all', () => {
    expect(decodeRoleFromToken('not-a-jwt')).toBeNull();
    expect(decodeUserIdFromToken('not-a-jwt')).toBeNull();
  });

  it('ignores a role claim that is not a string', () => {
    expect(decodeRoleFromToken(jwt({ [ROLE_CLAIM]: ['Admin', 'Field'] }))).toBeNull();
  });
});

describe('expiry', () => {
  it('accepts a token that still has time on it', () => {
    expect(isTokenExpired(jwt({ exp: inSeconds(3600) }))).toBe(false);
  });

  it('rejects one that has run out', () => {
    expect(isTokenExpired(jwt({ exp: inSeconds(-3600) }))).toBe(true);
  });

  it('allows 30 seconds of clock skew', () => {
    // A watch a few seconds fast should not sign the operator out mid-action.
    expect(isTokenExpired(jwt({ exp: inSeconds(-10) }))).toBe(false);
    expect(isTokenExpired(jwt({ exp: inSeconds(-31) }))).toBe(true);
  });

  it('treats a token with no expiry as still valid', () => {
    expect(isTokenExpired(jwt({ sub: 'x' }))).toBe(false);
  });

  it('treats an unreadable token as expired', () => {
    // Bootstrap goes straight to /login rather than rendering and bouncing on
    // the first 401.
    expect(isTokenExpired('garbage')).toBe(true);
  });
});
