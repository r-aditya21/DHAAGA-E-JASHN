"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AuthForm, { AuthMode } from "@/components/auth/AuthForm";
import { useAuth } from "@/context/AuthContext";
import { safeRedirect } from "@/lib/safeRedirect";
import "@/components/auth/auth.css";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = safeRedirect(searchParams.get("redirect"));
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("register");

  useEffect(() => {
    if (!loading && user) router.replace(redirectUrl);
  }, [loading, user, redirectUrl, router]);

  return (
    <div className="am-card">
      <header className="am-head">
        <h1 style={{ fontSize: "2.25rem" }}>
          {mode === "register" ? "Create your account" : "Welcome back"}
        </h1>
        <p>
          {mode === "register"
            ? "It takes a minute. Your bag and wishlist stay with you."
            : "Sign in to see your bag, wishlist and orders."}
        </p>
      </header>

      <AuthForm mode={mode} onModeChange={setMode} onSuccess={() => router.push(redirectUrl)} />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <>
      <Navbar />
      <main className="am-page">
        <Suspense fallback={null}>
          <AuthPageContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
