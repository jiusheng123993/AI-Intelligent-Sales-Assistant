import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'SALES' | 'TRAINER' | 'MANAGER' | 'ADMIN';
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      setUser,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }

  return context;
}
