import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, useAuthContext } from '../contexts/AuthContext';
import { account } from '../lib/appwrite';

export default function Login() {
  const { isLoaded, isSignedIn } = useAuth();
  const { checkUser } = useAuthContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await account.createEmailPasswordSession(email, password);
      await checkUser();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[0.7rem] tracking-[0.25em] uppercase text-accent animate-pulse">Loading...</div>;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-4 text-white relative">
      <div className="bg-glow"></div>
      <div className="w-full max-w-md bg-surface p-8 border border-line relative z-10">
        <h2 className="text-2xl font-serif mb-6 text-center">Authentication</h2>
        {error && <div className="bg-red-500/20 text-red-400 p-3 mb-4 text-sm font-mono">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required className="w-full bg-black border border-line p-3 text-sm focus:border-accent outline-none" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required className="w-full bg-black border border-line p-3 text-sm focus:border-accent outline-none" />
          <button type="submit" className="w-full btn-primary py-3 tracking-widest text-sm">LOG IN</button>
        </form>
        <p className="mt-6 text-center text-dim text-sm">Don't have an account? <Link to="/register" className="text-accent hover:underline">Register</Link></p>
      </div>
    </div>
  );
}
