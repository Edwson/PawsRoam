// web/src/app/paws-safer/layout.tsx
"use client";

import React, { ReactNode, useEffect } from 'react'; // Added useEffect
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } // Removed usePathname as it's not used for active link styling here
from 'next/navigation';
import Link from 'next/link';
import AppProviders from '@/components/AppProviders';
import MainLayout from '@/components/Layout'; // Main site layout

// Styles (can be shared/refactored with Admin/ShopOwner layouts later)
const specializedLayoutStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: 'calc(100vh - 120px)', // Adjust based on main header/footer
};

const sidebarStyle: React.CSSProperties = {
  width: '240px',
  backgroundColor: 'var(--accent-ultralight)', // PawsSafer theme color
  padding: '1.5rem',
  borderRight: '1px solid var(--accent-light)',
  flexShrink: 0,
};

const contentStyle: React.CSSProperties = {
  flexGrow: 1,
  padding: '1.5rem 2rem',
  backgroundColor: 'var(--current-background)',
  overflowY: 'auto',
};

const navLinkStyle: React.CSSProperties = {
  display: 'block',
  padding: '0.75rem 1rem',
  marginBottom: '0.5rem',
  borderRadius: '6px',
  textDecoration: 'none',
  color: 'var(--accent-dark)', // PawsSafer theme
  fontWeight: 500,
  transition: 'background-color 0.2s ease, color 0.2s ease',
};

// const activeNavLinkStyle: React.CSSProperties = {
//   ...navLinkStyle,
//   backgroundColor: 'var(--accent-color)',
//   color: 'white',
// };

const PawsSaferLayoutContent = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  // const pathname = usePathname(); // For active link styling

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'paws_safer' && user.role !== 'admin'))) {
      // Redirect or show access denied if not PawsSafer or Admin
      // router.replace('/auth/login?message=Access Denied. PawsSafer access only.');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <p>Loading PawsSafer Area...</p>
      </div>
    );
  }

  if (!user || (user.role !== 'paws_safer' && user.role !== 'admin')) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--current-background)', minHeight: 'calc(100vh - 120px)' }}>
        <h2>Access Denied</h2>
        <p>You must be registered and logged in as a PawsSafer or Administrator to access this section.</p>
        <Link href="/" className="button-style" style={{marginTop: '1rem'}}>Go to Homepage</Link>
        <br />
        <Link href="/auth/login" className="button-style secondary" style={{marginTop: '0.5rem'}}>Login</Link>
      </div>
    );
  }

  // User is authenticated and is 'paws_safer' or 'admin'
  return (
    <div style={specializedLayoutStyle}>
      <aside style={sidebarStyle}>
        <h3 style={{ color: 'var(--accent-dark)', marginBottom: '1.5rem', borderBottom: '1px solid var(--accent-color)', paddingBottom: '0.5rem' }}>
          PawsSafer Menu
        </h3>
        <nav>
          <Link href="/paws-safer/dashboard" style={navLinkStyle} /* className={pathname === '/paws-safer/dashboard' ? styles.activeLink : styles.navLink} */>
            🛡️ Active Alerts
          </Link>
          {/* Placeholder for future PawsSafer links */}
          {/* <Link href="/paws-safer/resources" style={navLinkStyle}>Emergency Resources</Link> */}
          <p style={{fontSize: '0.85em', color: 'var(--accent-dark)', marginTop: '1rem', opacity: 0.8}}>(Alerts & Resources coming soon)</p>
        </nav>
      </aside>
      <main style={contentStyle}>
        {children}
      </main>
    </div>
  );
};

// Main layout component for the /paws-safer route group
const PawsSaferLayout = ({ children }: { children: ReactNode }) => {
    return (
        <AppProviders>
            <MainLayout> {/* Nest within the main site layout */}
                <PawsSaferLayoutContent>{children}</PawsSaferLayoutContent>
            </MainLayout>
        </AppProviders>
    );
};

export default PawsSaferLayout;
