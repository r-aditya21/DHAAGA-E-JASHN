"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/context/AuthContext";

type GoogleLoginButtonProps = {
  onSuccess?: () => void;
  onError?: (message: string) => void;
  width?: number;
};

export default function GoogleLoginButton({
  onSuccess,
  onError,
  width = 320,
}: GoogleLoginButtonProps) {
  // Goes through the auth context so the navbar, cart and wishlist update
  // immediately after a Google sign-in (calling the API directly did not).
  const { googleLogin } = useAuth();

  // The Google button cannot render without a client id.
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        try {
          if (!credentialResponse.credential) {
            throw new Error("Google did not return a credential. Please try again.");
          }
          await googleLogin(credentialResponse.credential);
          onSuccess?.();
        } catch (error) {
          onError?.(
            error instanceof Error ? error.message : "Google sign-in failed. Please try again."
          );
        }
      }}
      onError={() => onError?.("Google sign-in was cancelled or failed. Please try again.")}
      theme="outline"
      shape="rectangular"
      size="large"
      text="continue_with"
      width={width}
      logo_alignment="left"
    />
  );
}
