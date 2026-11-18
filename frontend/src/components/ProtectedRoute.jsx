import React, { useEffect, useState } from 'react';
import { useAuth, SignInButton } from '@clerk/react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Wraps routes that strictly require authentication (e.g. Portfolio, Connected Brokers).
 * Never uses hard redirects to non-existent /sign-in routes.
 * Gracefully renders an in-place sign-in prompt with modal trigger.
 */
export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // If Clerk takes more than 700ms to resolve, do not keep the user staring at a spinner
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded && !showPrompt) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-200 border-t-emerald-600" />
          <p className="text-xs font-medium text-slate-400">Connecting to secure session...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:py-24 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign in to Access Your Portfolio</h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Your portfolio holdings, broker integrations, and trade synchronizations are secured. Sign in with your account to view your live investments.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <SignInButton mode="modal">
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3D2C] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#145A3E] transition cursor-pointer">
                <ShieldCheck className="h-4 w-4" />
                <span>Sign In Securely</span>
              </button>
            </SignInButton>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Explore Market</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

