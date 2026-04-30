import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { account } from '../lib/appwrite';
import { useAuth, useAuthContext } from '../contexts/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { checkUser } = useAuthContext();
  const [status, setStatus] = useState('loading'); // loading | verifying | success | need_login | error
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const userId = searchParams.get('userId');
  const secret = searchParams.get('secret');

  const attemptVerification = async () => {
    if (!userId || !secret) {
      setStatus('error');
      setErrorMsg('Invalid verification link. Missing parameters.');
      return;
    }

    setStatus('verifying');
    try {
      await account.updateVerification(userId, secret);
      await checkUser();
      setStatus('success');
      setTimeout(() => navigate('/dashboard', { replace: true }), 2500);
    } catch (err) {
      const msg = err?.message || '';
      // If the user has no active session, prompt login
      if (msg.includes('unauthorized') || msg.includes('missing scope') || 
          msg.includes('Invalid token') || msg.includes('401') ||
          err?.code === 401) {
        setStatus('need_login');
      } else {
        setStatus('error');
        setErrorMsg(msg || 'Verification failed. The link may have expired.');
      }
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      // User has an active session — try verifying immediately
      attemptVerification();
    } else {
      // No session — ask user to log in first
      setStatus('need_login');
    }
  }, [isLoaded, isSignedIn]);

  const handleLoginAndVerify = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      await account.createEmailPasswordSession(email, password);
      await checkUser();
      // Now try verification with the active session
      await attemptVerification();
    } catch (err) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoggingIn(false);
    }
  };

  if (!isLoaded || status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="font-mono text-[0.7rem] tracking-[0.25em] uppercase text-accent animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-4 text-white relative">
      <div className="bg-glow"></div>
      <div className="w-full max-w-md bg-surface p-8 border border-line relative z-10 text-center">

        {status === 'verifying' && (
          <>
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <h2 className="text-2xl font-serif mb-3">Verifying Email...</h2>
            <p className="text-dim text-sm">Please wait while we confirm your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-2xl font-serif mb-3">Email Verified!</h2>
            <p className="text-dim text-sm mb-6">
              Your email has been verified successfully. Redirecting to dashboard...
            </p>
            <Link to="/dashboard" className="btn-primary py-3 px-6 tracking-widest text-sm inline-block">
              GO TO DASHBOARD
            </Link>
          </>
        )}

        {status === 'need_login' && (
          <>
            <div className="text-4xl mb-4">🔐</div>
            <h2 className="text-2xl font-serif mb-3">Log In to Verify</h2>
            <p className="text-dim text-sm mb-6 leading-relaxed">
              Please log in to complete email verification.
            </p>
            {loginError && <div className="bg-red-500/20 text-red-400 p-3 mb-4 text-sm font-mono">{loginError}</div>}
            <form onSubmit={handleLoginAndVerify} className="space-y-4 text-left">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email" required
                className="w-full bg-black border border-line p-3 text-sm focus:border-accent outline-none"
              />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password" required
                className="w-full bg-black border border-line p-3 text-sm focus:border-accent outline-none"
              />
              <button
                type="submit" disabled={loggingIn}
                className="w-full btn-primary py-3 tracking-widest text-sm disabled:opacity-50"
              >
                {loggingIn ? 'VERIFYING...' : 'LOG IN & VERIFY'}
              </button>
            </form>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-2xl font-serif mb-3">Verification Failed</h2>
            <p className="text-red-400 text-sm mb-6 font-mono">{errorMsg}</p>
            <div className="space-y-3">
              <Link to="/login" className="btn-primary py-3 px-6 tracking-widest text-sm inline-block w-full">
                LOG IN
              </Link>
              <Link to="/register" className="block text-accent hover:underline text-sm">
                Create a new account
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
