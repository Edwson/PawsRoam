'use client';

import React, { useState, FormEvent } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link
import styles from '../AuthForm.module.css'; // Corrected Import CSS module

const REGISTER_USER = gql`
  mutation RegisterUser($email: String!, $password: String!, $name: String) {
    registerUser(email: $email, password: $password, name: $name) {
      token
      user {
        id
        email
        name
      }
    }
  }
`;

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const [registerUser, { loading }] = useMutation(REGISTER_USER, {
    onCompleted: (data) => {
      login(data.registerUser.token, data.registerUser.user);
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
      await registerUser({ variables: { email, password, name } });
    } catch { // err was unused
      // Error is handled by onError in useMutation
    }
  };

  return (
    <div className={styles.authFormContainer}>
      <div className={styles.authForm}>
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name">Name (Optional):</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className={styles.switchFormLink}>
          Already have an account? <Link href="/auth/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
