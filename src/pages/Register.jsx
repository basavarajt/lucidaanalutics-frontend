import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, useAuthContext } from '../contexts/AuthContext';
import { account } from '../lib/appwrite';
import { ID } from 'appwrite';

export default function Register() {
  const { isLoaded, isSignedIn } = useAuth();
  const { checkUser } = useAuthContext();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // 1. Create the account
      await account.create(ID.unique(), email, password, name);
      // 2. Create a session so the user is logged in
      await account.createEmailPasswordSession(email, password);
      // 3. Send verification email — the link will point to /verify-email on our site
      const verifyUrl = `${window.location.origin}/verify-email`;
      await account.createVerification(verifyUrl);
      // 4. Show the "check your email" screen
      setVerificationSent(true);
      await checkUser();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setError('');
    try {
      const verifyUrl = `${window.location.origin}/verify-email`;
      await account.createVerification(verifyUrl);
    } catch (err) {
      // 409 = verification already sent recently — not a real error
      if (err?.code === 409 || err?.message?.includes('Conflict')) {
        // Silently succeed — the email was already sent
      } else {
        setError(err.message);
      }
    } finally {
      setResending(false);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[0.7rem] tracking-[0.25em] uppercase text-accent animate-pulse">Loading...</div>;

  // ── Verification-sent screen ──
  if (verificationSent) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4 text-white relative">
        <div className="bg-glow"></div>
        <div className="w-full max-w-md bg-surface p-8 border border-line relative z-10 text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-2xl font-serif mb-3">Verify Your Email</h2>
          <p className="text-dim text-sm mb-6 leading-relaxed">
            We sent a verification link to <span className="text-accent font-mono">{email}</span>.
            <br />Please check your inbox (and spam folder) and click the link to activate your account.
          </p>
          {error && <div className="bg-red-500/20 text-red-400 p-3 mb-4 text-sm font-mono">{error}</div>}
          <button
            onClick={handleResendVerification}
            disabled={resending}
            className="w-full btn-primary py-3 tracking-widest text-sm mb-4 disabled:opacity-50"
          >
            {resending ? 'SENDING...' : 'RESEND VERIFICATION EMAIL'}
          </button>
          <p className="text-dim text-xs">
            Already verified?{' '}
            <Link to="/dashboard" className="text-accent hover:underline">Go to Dashboard</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-4 text-white relative">
      <div className="bg-glow"></div>
      <div className="w-full max-w-md bg-surface p-8 border border-line relative z-10">
        <h2 className="text-2xl font-serif mb-6 text-center">Create Account</h2>
        {error && <div className="bg-red-500/20 text-red-400 p-3 mb-4 text-sm font-mono">{error}</div>}
        <form onSubmit={handleRegister} className="space-y-4">
          <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Full Name" required className="w-full bg-black border border-line p-3 text-sm focus:border-accent outline-none" />
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required className="w-full bg-black border border-line p-3 text-sm focus:border-accent outline-none" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required minLength="8" className="w-full bg-black border border-line p-3 text-sm focus:border-accent outline-none" />
          <button type="submit" className="w-full btn-primary py-3 tracking-widest text-sm">REGISTER</button>
        </form>
        <p className="mt-6 text-center text-dim text-sm">Already have an account? <Link to="/login" className="text-accent hover:underline">Log in</Link></p>
      </div>
    </div>
  );
}
