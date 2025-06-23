'use client'; // This component uses client-side features (context providers)

import React, { ReactNode } from 'react';
import { ApolloProvider } from '@apollo/client';
import client from '@/lib/apolloClient'; // Ensure this path is correct
import { AuthProvider } from '@/contexts/AuthContext'; // Ensure this path is correct

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ApolloProvider>
  );
};

export default AppProviders;
