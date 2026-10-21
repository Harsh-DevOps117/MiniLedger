import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@miniledger/contracts';
import { ApiClient } from '../lib/api';
import { readSession, writeSession } from '../lib/session-store';
import { errorMessage } from '../lib/format';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  notice: string | null;
  api: ApiClient;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    void readSession()
      .then(setSession)
      .catch(() => setNotice('Could not restore your session. Please sign in.'))
      .finally(() => setLoading(false));
  }, []);
  const clearSession = useCallback(async () => {
    setSession(null);
    try {
      await writeSession(null);
    } catch (error) {
      setNotice(`Could not clear saved session: ${errorMessage(error)}`);
    }
  }, []);
  const api = useMemo(
    () =>
      new ApiClient(session?.token, () => {
        setNotice('Your session expired. Please sign in again.');
        void clearSession();
      }),
    [session?.token, clearSession],
  );
  async function signIn(next: Session) {
    await writeSession(next);
    setSession(next);
    setNotice(null);
  }
  return (
    <AuthContext.Provider value={{ session, loading, notice, api, signIn, signOut: clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requires AuthProvider');
  return value;
}
