
"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
// No longer importing useRouter here, as LoginPage will handle navigation
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Simple SVG for Google icon
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C42.77 39.34 46.98 32.77 46.98 24.55z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);


export function LoginForm() {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isButtonLoading, setIsButtonLoading] = useState(false); // Renamed to avoid conflict with useAuth().isLoading

  async function handleGoogleLogin() {
    setIsButtonLoading(true);
    const success = await loginWithGoogle();
    if (!success) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Google Sign-In failed. Please try again.",
      });
    }
    // If login is successful, AuthContext state (isAuthenticated) will change.
    // The LoginPage component (which renders this form) will then handle the redirect to /dashboard.
    setIsButtonLoading(false);
  }

  return (
    <div className="space-y-6">
      <Button 
        onClick={handleGoogleLogin} 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2" 
        disabled={isButtonLoading}
      >
        {isButtonLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <GoogleIcon />
            Sign in with Google
          </>
        )}
      </Button>
    </div>
  );
}
