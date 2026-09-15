'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createAuthRevisionGuard, createSessionRestorer } from './session-restoration';

interface AuthUser {
  id: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  roles: Array<{ id: string; key: string; name: string }>;
  permissions: string[];
  branchIds: string[];
}

interface SessionResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login(companyCode: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  authenticatedFetch(input: string, init?: RequestInit): Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const requestRefreshSession = createSessionRestorer<SessionResponse>(`${API_URL}/auth/refresh`);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const authRevision = useRef(createAuthRevisionGuard());

  const acceptSession = useCallback((session: SessionResponse) => {
    setUser(session.user);
    setAccessToken(session.accessToken);
    setStatus('authenticated');
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    const revision = authRevision.current.capture();
    const session = await requestRefreshSession();
    if (!authRevision.current.isCurrent(revision)) return null;
    if (!session) {
      setUser(null);
      setAccessToken(null);
      setStatus('anonymous');
      return null;
    }
    acceptSession(session);
    return session.accessToken;
  }, [acceptSession]);

  useEffect(() => {
    let active = true;
    const revision = authRevision.current.capture();
    void requestRefreshSession()
      .then((session) => {
        if (!active || !authRevision.current.isCurrent(revision)) return;
        if (!session) {
          setUser(null);
          setAccessToken(null);
          setStatus('anonymous');
          return;
        }
        acceptSession(session);
      })
      .catch(() => {
        if (active && authRevision.current.isCurrent(revision)) setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, [acceptSession]);

  const login = useCallback(
    async (companyCode: string, email: string, password: string) => {
      const revision = authRevision.current.advance();
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ companyCode, email, password }),
      });
      if (!authRevision.current.isCurrent(revision)) return;
      if (!response.ok) throw new Error('Sign in failed. Check your company code and credentials.');
      acceptSession((await response.json()) as SessionResponse);
    },
    [acceptSession],
  );

  const logout = useCallback(async () => {
    authRevision.current.advance();
    if (accessToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { authorization: `Bearer ${accessToken}` },
      }).catch(() => undefined);
    }
    setUser(null);
    setAccessToken(null);
    setStatus('anonymous');
  }, [accessToken]);

  const authenticatedFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      let token = accessToken;
      if (!token) token = await refresh();
      if (!token) throw new Error('Authentication required');
      const headers = new Headers(init.headers);
      headers.set('authorization', `Bearer ${token}`);
      let response = await fetch(`${API_URL}${input}`, {
        ...init,
        headers,
        credentials: 'include',
      });
      if (response.status === 401) {
        token = await refresh();
        if (!token) return response;
        headers.set('authorization', `Bearer ${token}`);
        response = await fetch(`${API_URL}${input}`, { ...init, headers, credentials: 'include' });
      }
      return response;
    },
    [accessToken, refresh],
  );

  const value = useMemo(
    () => ({ user, status, login, logout, authenticatedFetch }),
    [user, status, login, logout, authenticatedFetch],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
