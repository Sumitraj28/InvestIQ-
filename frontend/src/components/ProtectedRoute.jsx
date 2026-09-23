import React from 'react';
import { useAuth, RedirectToSignIn } from '@clerk/react';

/**
 * Wraps any route that requires authentication.
 * Shows a loading spinner while Clerk loads, redirects to sign-in if not authenticated.
 */
export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return children;
}
