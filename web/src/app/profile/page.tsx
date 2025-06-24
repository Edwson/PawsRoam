'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import styles from '../auth/AuthForm.module.css'; // Reuse auth form styles for container
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload'; // Import the component
import Image from 'next/image'; // For displaying current avatar

const placeholderAvatar = "/default-avatar.png"; // Consistent placeholder

const ProfilePage = () => {
  const { user, loading, login, token } = useAuth(); // login to update context, token for re-login
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?message=Please login to view your profile.');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Show loading or a redirecting message, or null if redirect is fast enough
    return <div style={{textAlign: 'center', padding: '2rem'}}>Loading profile...</div>;
  }

  const handleUploadSuccess = (newAvatarUrl: string) => {
    // Update user context with the new avatar URL
    // The login function in AuthContext handles updating localStorage and state
    if (user && token) { // Ensure user and token are available
      const updatedUser = { ...user, avatar_url: newAvatarUrl };
      login(token, updatedUser); // Re-login with updated user data; token remains the same
    }
  };

  const displayAvatarUrl = user.avatar_url || placeholderAvatar;

  return (
    <div className={styles.authFormContainer} style={{ justifyContent: 'flex-start', alignItems:'flex-start', paddingTop: '2rem', gap: '2rem', flexDirection: 'row', flexWrap:'wrap' }}>
      <div className={styles.authForm} style={{ marginTop: 0, flex: '1 1 300px', maxWidth: '450px' }}>
        <h2>User Profile</h2>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Image
            src={displayAvatarUrl}
            alt={`${user.name || user.email}'s avatar`}
            width={120}
            height={120}
            style={{ borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-color)' }}
            onError={(e) => { (e.target as HTMLImageElement).src = placeholderAvatar; }}
          />
        </div>

        <div style={{ lineHeight: '1.8' }}>
          <p><strong>ID:</strong> <span style={{fontSize: '0.85em', color: 'var(--text-color-muted)'}}>{user.id}</span></p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Name:</strong> {user.name || 'Not provided'}</p>
          <p><strong>Role:</strong> <span style={{textTransform: 'capitalize'}}>{user.role || 'User'}</span></p>
          <p><strong>Status:</strong> <span style={{textTransform: 'capitalize'}}>{user.status || 'Active'}</span></p>
        </div>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-color-muted)'}}>
          Manage your profile details and preferences here.
        </p>
      </div>

      <div className={styles.authForm} style={{ marginTop: 0, flex: '1 1 300px', maxWidth: '450px' }}>
        <ProfilePictureUpload
          currentAvatarUrl={user.avatar_url}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>
    </div>
  );
};

export default ProfilePage;
