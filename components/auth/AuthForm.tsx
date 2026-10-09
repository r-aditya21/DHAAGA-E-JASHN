"use client";

import { useId, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";

export type AuthMode = "signin" | "register";

type AuthFormProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: () => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthForm({ mode, onModeChange, onSuccess }: AuthFormProps) {
  const { login, register } = useAuth();
  const uid = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  const switchMode = (next: AuthMode) => {
    setError("");
    onModeChange(next);
  };

  // Mirrors the API rules so people get feedback before a round trip.
  const validate = (): string => {
    if (isRegister && (name.trim().length < 2 || name.trim().length > 80)) {
      return "Enter your name (2 to 80 characters).";
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return "Enter a valid email address.";
    }
    if (isRegister && (password.length < 8 || new TextEncoder().encode(password).length > 72)) {
      return "Use a password of 8 to 72 characters.";
    }
    if (!isRegister && !password) {
      return "Enter your password.";
    }
    return "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      if (isRegister) {
        await register({ name: name.trim(), email: email.trim(), password });
      } else {
        await login({ email: email.trim(), password });
      }

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isRegister
          ? "We could not create your account. Please try again."
          : "We could not sign you in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="am-form-wrap">
      <div className="am-tabs" role="tablist" aria-label="Account">
        <button
          type="button"
          role="tab"
          id={`${uid}-tab-signin`}
          aria-selected={!isRegister}
          aria-controls={`${uid}-panel`}
          className={`am-tab ${!isRegister ? "is-active" : ""}`}
          onClick={() => switchMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          id={`${uid}-tab-register`}
          aria-selected={isRegister}
          aria-controls={`${uid}-panel`}
          className={`am-tab ${isRegister ? "is-active" : ""}`}
          onClick={() => switchMode("register")}
        >
          Create account
        </button>
      </div>

      <div
        id={`${uid}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${isRegister ? "register" : "signin"}`}
      >
        <form className="am-form" onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div className="am-field">
              <label htmlFor={`${uid}-name`}>Full name</label>
              <input
                id={`${uid}-name`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                data-autofocus={isRegister ? "" : undefined}
                required
              />
            </div>
          )}

          <div className="am-field">
            <label htmlFor={`${uid}-email`}>Email</label>
            <input
              id={`${uid}-email`}
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              data-autofocus={!isRegister ? "" : undefined}
              required
            />
          </div>

          <div className="am-field">
            <label htmlFor={`${uid}-password`}>Password</label>
            <div className="am-password">
              <input
                id={`${uid}-password`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                aria-describedby={isRegister ? `${uid}-hint` : undefined}
                required
              />
              <button
                type="button"
                className="am-reveal"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {isRegister && (
              <p id={`${uid}-hint`} className="am-hint">
                At least 8 characters.
              </p>
            )}
          </div>

          <div className="am-error-slot" aria-live="polite">
            {error && (
              <p className="am-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <button type="submit" className="am-submit" disabled={submitting}>
            {submitting
              ? isRegister
                ? "Creating your account…"
                : "Signing in…"
              : isRegister
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <div className="am-divider">
              <span>or</span>
            </div>

            <div className="am-google">
              <GoogleLoginButton onSuccess={onSuccess} onError={setError} />
            </div>
          </>
        )}

        <p className="am-switch">
          {isRegister ? "Already have an account?" : "New to Dhaaga-E-Jashn?"}{" "}
          <button type="button" onClick={() => switchMode(isRegister ? "signin" : "register")}>
            {isRegister ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
