import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { account } from '../lib/appwrite';
import { ID } from 'appwrite';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState(null);

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const getToken = useCallback(async () => {
    try {
      const jwt = await account.createJWT();
      return jwt.jwt;
    } catch (e) {
      return null;
    }
  }, []);

  const signOut = async ({ redirectUrl }) => {
    try {
      await account.deleteSession('current');
    } catch (e) {}
    setUser(null);
    if (redirectUrl) window.location.href = redirectUrl;
  };

  const sendVerificationEmail = useCallback(async () => {
    const verifyUrl = `${window.location.origin}/verify-email`;
    // Let errors propagate to the caller so they can handle 409/401 etc.
    await account.createVerification(verifyUrl);
  }, []);

  const useAuthValue = {
    isLoaded,
    isSignedIn: !!user,
    emailVerified: user?.emailVerification ?? false,
    getToken,
    signOut,
    sendVerificationEmail,
  };

  const useUserValue = {
    user: user ? {
      primaryEmailAddress: { emailAddress: user.email },
      fullName: user.name || 'User',
      id: user.$id
    } : null
  };

  const useClerkValue = {
    signOut
  };

  return (
    <AuthContext.Provider value={{ useAuthValue, useUserValue, useClerkValue, checkUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext).useAuthValue;
export const useUser = () => useContext(AuthContext).useUserValue;
export const useClerk = () => useContext(AuthContext).useClerkValue;
export const useAuthContext = () => useContext(AuthContext);
