import { ClerkProvider } from '@clerk/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key. Please check .env.local');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>
);