'use client';

import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      // Optional: Display a user-friendly error message here
      setLoading(false);
    }
  };

  return (
    // Added 'bg-slate-50' for a slightly cleaner background base
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50">
      
      {/* --- Updated Background Blobs (Bolder & Sharper) --- */}
      {/* Blob 1: Indigo (Center, pulsing) - Lower blur, higher opacity */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/40 rounded-full blur-[80px] mix-blend-multiply animate-pulse" />
      
      {/* Blob 2: Teal (Top Right) - Lower blur, higher opacity */}
      <div className="absolute top-1/2 left-1/2 -translate-x-[30%] -translate-y-[60%] w-[600px] h-[600px] bg-teal-400/40 rounded-full blur-[60px] mix-blend-multiply" />
      
      {/* Blob 3: Purple (Bottom Left) - Lower blur, higher opacity */}
      <div className="absolute top-1/2 left-1/2 -translate-x-[70%] -translate-y-[30%] w-[600px] h-[600px] bg-purple-400/40 rounded-full blur-[60px] mix-blend-multiply" />


      {/* --- The Glass Card (Unchanged) --- */}
      <div className="relative z-10 w-full max-w-md p-10 bg-white/70 backdrop-blur-3xl border border-white/50 shadow-2xl shadow-indigo-500/10 rounded-3xl text-center">
        
        {/* Logo Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            Prisync
          </h1>
          <p className="mt-2 text-slate-500 font-medium text-sm">
            Your infinite collaborative space
          </p>
        </div>

        {/* Divider */}
        <div className="w-16 h-1 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-full mx-auto mb-8" />

        {/* The Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="group relative w-full flex items-center justify-center gap-3 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 text-slate-700 font-semibold py-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {loading ? (
            <span className="text-sm text-indigo-600 font-medium">Connecting...</span>
          ) : (
            <>
              {/* Google SVG Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

      </div>
      
      {/* Footer Text */}
      <div className="absolute bottom-6 text-slate-400 text-xs font-medium tracking-wide">
        DESIGNED FOR SPRINT 1
      </div>
    </div>
  );
}