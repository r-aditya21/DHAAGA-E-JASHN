"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/auth/AuthModal";
import type { AuthMode } from "@/components/auth/AuthForm";
import { useAuth } from "@/context/AuthContext";
import { safeRedirect } from "@/lib/safeRedirect";

export type OpenAuthOptions = {
  mode?: AuthMode;
  /** Short line shown under the heading, e.g. "Sign in to add items to your bag". */
  message?: string;
  /** Same-site path to go to after signing in. Omit to stay on the current page. */
  redirect?: string;
};

type AuthModalContextType = {
  openAuth: (options?: OpenAuthOptions) => void;
  closeAuth: () => void;
};

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [message, setMessage] = useState<string | undefined>();
  const [redirect, setRedirect] = useState<string | undefined>();

  const openAuth = useCallback((options: OpenAuthOptions = {}) => {
    setMode(options.mode ?? "signin");
    setMessage(options.message);
    setRedirect(options.redirect ? safeRedirect(options.redirect, "") || undefined : undefined);
    setOpen(true);
  }, []);

  const closeAuth = useCallback(() => setOpen(false), []);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    if (redirect) router.push(redirect);
  }, [redirect, router]);

  const value = useMemo(() => ({ openAuth, closeAuth }), [openAuth, closeAuth]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        // Anything that signs the person in (e.g. Google) also dismisses the dialog.
        open={open && !user}
        mode={mode}
        message={message}
        onModeChange={setMode}
        onClose={closeAuth}
        onSuccess={handleSuccess}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}
