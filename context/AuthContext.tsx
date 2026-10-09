"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  User,
  getCurrentUser,
  logoutUser,
  loginUser,
  registerUser,
  googleLogin as authGoogleLogin,
} from "@/lib/api/auth";
import { getCart } from "@/lib/api/cart";
import { getWishlist } from "@/lib/api/wishlist";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  cartCount: number;
  wishlistIds: string[];
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  const refreshCart = useCallback(async () => {
    try {
      const res = await getCart();
      const count = res.summary?.itemCount ?? res.cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0;
      setCartCount(count);
      window.dispatchEvent(new CustomEvent("dhaaga:bagupdate", { detail: count }));
    } catch {
      setCartCount(0);
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    try {
      const res = await getWishlist();
      const ids = res.wishlist?.products?.map((p: any) => (typeof p === "string" ? p : p._id)) || [];
      setWishlistIds(ids);
    } catch {
      setWishlistIds([]);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      if (data?.user) {
        setUser(data.user);
        await Promise.allSettled([refreshCart(), refreshWishlist()]);
      } else {
        setUser(null);
        setCartCount(0);
        setWishlistIds([]);
      }
    } catch {
      setUser(null);
      setCartCount(0);
      setWishlistIds([]);
    } finally {
      setLoading(false);
    }
  }, [refreshCart, refreshWishlist]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (data: { email: string; password: string }) => {
    await loginUser(data);
    await refreshUser();
  };

  const register = async (data: { name: string; email: string; password: string }) => {
    await registerUser(data);
    // After registration, try login or refresh
    try {
      await loginUser({ email: data.email, password: data.password });
      await refreshUser();
    } catch {
      // If auto-login fails, let the user manually log in
    }
  };

  const googleLogin = async (credential: string) => {
    await authGoogleLogin(credential);
    await refreshUser();
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setCartCount(0);
      setWishlistIds([]);
      window.dispatchEvent(new CustomEvent("dhaaga:bagupdate", { detail: 0 }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        cartCount,
        wishlistIds,
        login,
        register,
        googleLogin,
        logout,
        refreshUser,
        refreshCart,
        refreshWishlist,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
