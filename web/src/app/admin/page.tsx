'use client'; // Good practice for pages that might use hooks or interactivity, though this one is simple

import React from 'react';
import Link from 'next/link';
import adminStyles from './AdminLayout.module.css'; // Import shared admin styles

// Re-using cardStyle from AdminLayout.module.css or define locally if preferred
// For this example, I'll assume adminStyles.adminSection can be used for card-like appearance.

const linkStyle: React.CSSProperties = { // Keep this for specific link styling if needed
  textDecoration: 'none',
  color: 'var(--primary-color)',
  fontWeight: '500',
};

const AdminDashboardPage = () => {
  return (
    <div>
      <h2 className={adminStyles.adminPageTitle}>Admin Dashboard</h2>
      <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>
        Welcome to the PawsRoam Admin Area. From here, you can manage various aspects of the application.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className={adminStyles.adminSection}> {/* Using adminSection for card style */}
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>User Management</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--text-color-muted)', fontSize: '0.9rem' }}>
            View, edit roles, and manage user statuses.
          </p>
          <Link href="/admin/users" style={linkStyle}>Go to Manage Users &rarr;</Link>
        </div>

        <div className={adminStyles.adminSection}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Venue Management</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--text-color-muted)', fontSize: '0.9rem' }}>
            Approve, edit, or manage venue listings.
          </p>
          <span style={{ color: 'var(--text-color-muted)' }}>(Coming Soon)</span>
        </div>

        <div className={adminStyles.adminSection}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Review Moderation</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--text-color-muted)', fontSize: '0.9rem' }}>
            View and manage user-submitted reviews.
          </p>
          <span style={{ color: 'var(--text-color-muted)' }}>(Coming Soon)</span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
