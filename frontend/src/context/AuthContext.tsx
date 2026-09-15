import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole =
  | "SYSTEM_ADMIN"
  | "RISK_OFFICER"
  | "EMPLOYEE"
  | "admin"
  | "risk_officer"
  | "employee";

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  gender?: string;
  role: UserRole;
  department: string;
  status?: string;
  organization_id?: number;
  organization_name?: string;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (payload: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateCurrentUser: (userData: Partial<User>) => void;
  loading: boolean;
  error: string | null;
  isSystemAdmin: boolean;
  isRiskOfficer: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => false,
  register: async () => ({ success: false }),
  logout: () => {},
  updateCurrentUser: () => {},
  loading: false,
  error: null,
  isSystemAdmin: false,
  isRiskOfficer: false,
  isEmployee: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("eridss_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("eridss_token") || null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync user profile directly with backend API on startup
  useEffect(() => {
    const refreshUserFromDb = async () => {
      const storedToken = localStorage.getItem("eridss_token");
      if (!storedToken) return;

      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
        if (res.ok) {
          const freshUser = await res.json();
          setUser((prev) => ({ ...freshUser, token: storedToken }));
          localStorage.setItem(
            "eridss_user",
            JSON.stringify({ ...freshUser, token: storedToken }),
          );
        } else if (res.status === 401) {
          logout();
        }
      } catch (err) {
        console.error("Failed to sync user profile with database:", err);
      }
    };

    refreshUserFromDb();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Invalid email or password");
      }

      const data = await res.json();
      setUser(data);
      setToken(data.token);
      localStorage.setItem("eridss_user", JSON.stringify(data));
      localStorage.setItem("eridss_token", data.token);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    payload: any,
  ): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Registration failed");
      }

      const data = await res.json();
      if (data.token && data.user) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("eridss_user", JSON.stringify(data.user));
        localStorage.setItem("eridss_token", data.token);
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("eridss_user");
    localStorage.removeItem("eridss_token");
  };

  const updateCurrentUser = (userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      localStorage.setItem("eridss_user", JSON.stringify(updated));
      return updated;
    });
  };

  const roleStr = (user?.role || "").toUpperCase();
  const isSystemAdmin = roleStr === "SYSTEM_ADMIN" || roleStr === "ADMIN";
  const isRiskOfficer = roleStr === "RISK_OFFICER" || roleStr === "OFFICER";
  const isEmployee = roleStr === "EMPLOYEE";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        updateCurrentUser,
        loading,
        error,
        isSystemAdmin,
        isRiskOfficer,
        isEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
