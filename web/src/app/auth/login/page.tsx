'use client';

import React, { useState, FormEvent } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link
import styles from './AuthForm.module.css'; // Import CSS module

const LOGIN_USER = gql`
  mutation LoginUser($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      token
      user {
        id
        email
        name
      }
    }
  }
`;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const [loginUser, { loading }] = useMutation(LOGIN_USER, {
    onCompleted: (data) => {
      login(data.loginUser.token, data.loginUser.user);
      router.push('/profile'); // Redirect to profile page or dashboard
    },
    onError: (apolloError) => {
      setError(apolloError.message);
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    try {
      await loginUser({ variables: { email, password } });
    } catch (err) {
      // Error is handled by onError in useMutation
    }
  };

  return (
    <div className={styles.authFormContainer}>
      <div className={styles.authForm}>
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className={styles.switchFormLink}>
          Don&apos;t have an account? <Link href="/auth/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
