import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, useAuthContext } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn, emailVerified, sendVerificationEmail } = useAuth();
  const { checkUser } = useAuthContext();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer — prevents repeated 409 errors from Appwrite
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Periodically re-check verification status (user may have verified in another tab)
  useEffect(() => {
    if (emailVerified) return;
    const interval = setInterval(() => {
      checkUser();
    }, 10_000); // check every 10s
    return () => clearInterval(interval);
  }, [emailVerified, checkUser]);

  const handleRefresh = useCallback(async () => {
    await checkUser();
  }, [checkUser]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-accent">Loading session...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  // Gate: email must be verified to access protected pages
  if (!emailVerified) {
    const handleResend = async () => {
      setResending(true);
      setError('');
      try {
        await sendVerificationEmail();
        setResent(true);
        setCooldown(60); // 60s cooldown after successful send
      } catch (e) {
        const code = e?.code;
        const msg = e?.message || '';

        if (code === 409 || msg.includes('already been sent') || msg.includes('Conflict')) {
          // Verification was already sent — not an error, just inform the user
          setResent(true);
          setCooldown(60);
        } else if (code === 401 || msg.includes('unauthorized') || msg.includes('missing scope')) {
          setError('Session expired. Please log in again.');
        } else {
          setError(msg || 'Failed to send verification email. Please try again.');
        }
      } finally {
        setResending(false);
      }
    };

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4 text-white relative">
        <div className="bg-glow"></div>
        <div className="w-full max-w-md bg-surface p-8 border border-line relative z-10 text-center">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-2xl font-serif mb-3">Email Verification Required</h2>
          <p className="text-dim text-sm mb-6 leading-relaxed">
            Please verify your email address before accessing the dashboard.
            Check your inbox for a verification link.
          </p>
          {resent && (
            <div className="bg-green-500/20 text-green-400 p-3 mb-4 text-sm font-mono">
              Verification email sent! Check your inbox (and spam folder).
            </div>
          )}
          {error && (
            <div className="bg-red-500/20 text-red-400 p-3 mb-4 text-sm font-mono">
              {error}
            </div>
          )}
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full btn-primary py-3 tracking-widest text-sm mb-4 disabled:opacity-50"
          >
            {resending
              ? 'SENDING...'
              : cooldown > 0
                ? `RESEND IN ${cooldown}s`
                : 'RESEND VERIFICATION EMAIL'}
          </button>
          <p className="text-dim text-xs">
            Already verified?{' '}
            <button onClick={handleRefresh} className="text-accent hover:underline">
              Refresh page
            </button>
          </p>
        </div>
      </div>
    );
  }

  return children;
}
