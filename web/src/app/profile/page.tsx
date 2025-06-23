'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import styles from '../auth/AuthForm.module.css'; // Reuse auth form styles for container

const ProfilePage = () => {
  const { user, loading } = useAuth(); // Removed token as it's not displayed
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?message=Please login to view your profile.');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Show loading or a redirecting message, or null if redirect is fast enough
    return <div>Loading profile...</div>;
  }

  return (
    <div className={styles.authFormContainer} style={{ justifyContent: 'flex-start', paddingTop: '2rem' }}>
      <div className={styles.authForm} style={{ marginTop: '2rem' }}>
        <h2>User Profile</h2>
        <div style={{ lineHeight: '1.8' }}> {/* Better spacing for profile details */}
          <p>
            <strong>ID:</strong> {user.id}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Name:</strong> {user.name || 'Not provided'}
          </p>
        </div>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-color-muted)'}}>
          This is your PawsRoam profile page. More features will be added here soon!
        </p>
        {/* Add links to edit profile, view pets, etc. later */}
      </div>
    </div>
  );
};

export default ProfilePage;
