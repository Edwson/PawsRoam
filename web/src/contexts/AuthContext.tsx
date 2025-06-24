'use client'; // This is a client component

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApolloError, useApolloClient } from '@apollo/client';
// You might want to define a User type that matches your GraphQL schema
interface User {
  id: string;
  email: string;
  name?: string | null; // Align with GraphQL User type
  role?: string; // Added role
  status?: string; // Added status
  avatar_url?: string | null; // Added avatar_url
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  // errors, etc. could be added here
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // To check initial auth status
  const apolloClient = useApolloClient();

  useEffect(() => {
    // Check for token in localStorage on initial load
    const storedToken = localStorage.getItem('pawsroam-token');
    const storedUser = localStorage.getItem('pawsroam-user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        localStorage.removeItem('pawsroam-token');
        localStorage.removeItem('pawsroam-user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('pawsroam-token', newToken);
    localStorage.setItem('pawsroam-user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = async () => {
    localStorage.removeItem('pawsroam-token');
    localStorage.removeItem('pawsroam-user');
    setToken(null);
    setUser(null);
    try {
      // Reset Apollo Client store to clear cached user-specific data
      await apolloClient.resetStore();
    } catch (error) {
      console.error("Error resetting Apollo store on logout:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
