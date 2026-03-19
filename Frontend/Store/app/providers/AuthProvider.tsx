"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { getMe, logoutUser } from "../lib/auth";
import { isAuthScreenPath } from "../lib/route-visibility";

interface Address {
  full_name?: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;
  region?: string;
  country?: string;
  phone?: string;
  vat_id?: string | null;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  profile_image?: string;
  phone?: string;
  role: string;
  address?: Address;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  sessionReady: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  getSessionId: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const skipUserBootstrap = isAuthScreenPath(pathname);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionReady, setSessionReady] = useState(false);

  const toAuthUser = useCallback((userData: NonNullable<Awaited<ReturnType<typeof getMe>>>): User => {
    const firstName = userData.firstName ?? userData.first_name ?? "";
    const lastName = userData.lastName ?? userData.last_name ?? "";

    return {
      ...userData,
      firstName,
      lastName,
      phone: userData.phone,
      name: `${firstName} ${lastName}`.trim(),
    };
  }, []);

  // Initialize session ID
  useEffect(() => {
    const storedSessionId = localStorage.getItem("session_id");
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = `sess_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      localStorage.setItem("session_id", newSessionId);
      setSessionId(newSessionId);
    }

    setSessionReady(true);
  }, []);

  // Load user on mount
  const refreshUser = useCallback(async () => {
    try {
      const userData = await getMe();
      const nextUser = userData ? toAuthUser(userData) : null;
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      console.error("Failed to load user:", error);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toAuthUser]);

  useEffect(() => {
    if (skipUserBootstrap) {
      setIsLoading(false);
      return;
    }

    void refreshUser();
  }, [refreshUser, skipUserBootstrap]);

  const login = useCallback((userData: User) => {
    setUser(userData);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      // Keep session ID for guest cart
    }
  }, []);

  const getSessionId = useCallback(() => sessionId, [sessionId]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      sessionReady,
      login,
      logout,
      refreshUser,
      getSessionId,
    }),
    [getSessionId, isLoading, login, logout, refreshUser, sessionReady, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
