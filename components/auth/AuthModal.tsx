"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import AuthForm, { AuthMode } from "@/components/auth/AuthForm";
import "./auth.css";

type AuthModalProps = {
  open: boolean;
  mode: AuthMode;
  message?: string;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onSuccess: () => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AuthModal({
  open,
  mode,
  message,
  onModeChange,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Lock page scroll without the layout jumping when the scrollbar disappears.
  useEffect(() => {
    if (!open) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Focus management: move focus in, trap Tab, close on Escape, restore on exit.
  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;

    const frame = requestAnimationFrame(() => {
      const target =
        dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ||
        dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);

      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  // Re-focus the first field when switching between sign in and register.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, open]);

  if (!open || typeof document === "undefined") return null;

  const isRegister = mode === "register";

  return createPortal(
    <div
      className="am-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="am-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <aside className="am-aside" aria-hidden="true">
          <Image
            src="/images/brandmark.webp"
            alt=""
            width={56}
            height={58}
            className="am-brandmark"
          />
          <p className="am-aside-line">Rooted in tradition. Crafted with love.</p>
          <ul className="am-aside-list">
            <li>Track every order</li>
            <li>Save pieces to your wishlist</li>
            <li>Keep addresses for faster checkout</li>
          </ul>
        </aside>

        <section className="am-main">
          <button type="button" className="am-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>

          <header className="am-head">
            <h2 id={titleId}>{isRegister ? "Create your account" : "Welcome back"}</h2>
            <p>
              {message ||
                (isRegister
                  ? "It takes a minute. Your bag and wishlist stay with you."
                  : "Sign in to see your bag, wishlist and orders.")}
            </p>
          </header>

          <AuthForm mode={mode} onModeChange={onModeChange} onSuccess={onSuccess} />
        </section>
      </div>
    </div>,
    document.body
  );
}
