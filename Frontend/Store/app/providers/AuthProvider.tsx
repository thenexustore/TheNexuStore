"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getMe, logoutUser } from "../lib/auth";

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
  login: (userData: User) => void;
  logout: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>("");

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
  }, []);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getMe();
        if (userData) {
          setUser({
            ...userData,
            name: `${userData.first_name} ${userData.last_name}`,
          });
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      // Keep session ID for guest cart
    }
  };

  const getSessionId = () => {
    return sessionId;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        getSessionId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
