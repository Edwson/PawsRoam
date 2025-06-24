'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// import { useRouter } from 'next/navigation'; // router was unused
import Link from 'next/link';
import styles from './AdminLayout.module.css'; // Import the CSS module

// Basic styles for the admin layout (some can remain, others can move to module)
const adminLayoutContainerStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: 'calc(100vh - 60px)', // Assuming main layout header is approx 60px (from main Layout.tsx)
};

const adminSidebarStyle: React.CSSProperties = {
  width: '220px',
  backgroundColor: 'var(--current-surface)',
  padding: '1.5rem',
  borderRight: '1px solid var(--current-border-color)',
  flexShrink: 0, // Prevent sidebar from shrinking
};

const adminContentStyle: React.CSSProperties = {
  flexGrow: 1,
  padding: '1.5rem',
  backgroundColor: 'var(--current-background)',
  overflowY: 'auto', // Allow content to scroll if it's too long
};


const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  // const router = useRouter(); // router was unused

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)' }}>
        <p>Loading admin section...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    // Option 1: Redirect (uncomment to use)
    // React.useEffect(() => {
    //   router.push('/');
    // }, [router]);
    // return (
    //   <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)' }}>
    //     <p>Redirecting...</p>
    //   </div>
    // );

    // Option 2: Show Access Denied message
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <Link href="/">Go to Homepage</Link>
      </div>
    );
  }

  // If user is admin, render the admin layout
  return (
    <div style={adminLayoutContainerStyle}>
      <aside style={adminSidebarStyle}>
        <h3 style={{ color: 'var(--primary-dark)', marginBottom: '1.5rem', borderBottom: '1px solid var(--current-border-color)', paddingBottom: '0.5rem' }}>Admin Menu</h3>
        <nav>
          <Link href="/admin" className={styles.adminNavLink}>Dashboard</Link>
          <Link href="/admin/users" className={styles.adminNavLink}>Manage Users</Link>
          <Link href="/admin/venues" className={styles.adminNavLink}>Manage Venues</Link>
          <Link href="/admin/claims" className={styles.adminNavLink}>Venue Claims</Link>
          {/* Add more admin links here as features are added */}
          {/* e.g., <Link href="/admin/reviews" className={styles.adminNavLink}>Manage Reviews</Link> */}
        </nav>
      </aside>
      <main style={adminContentStyle}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
