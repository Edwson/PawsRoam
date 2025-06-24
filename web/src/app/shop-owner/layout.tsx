// web/src/app/shop-owner/layout.tsx
"use client";

import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppProviders from '@/components/AppProviders'; // To ensure Apollo and Auth context
import MainLayout from '@/components/Layout'; // To nest this specialized layout within the main site layout

// Styles similar to AdminLayout, can be refactored into a shared component or module later if needed
const specializedLayoutStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: 'calc(100vh - 120px)', // Assuming main header + footer height
};

const sidebarStyle: React.CSSProperties = {
  width: '240px',
  backgroundColor: 'var(--current-surface)', // Slightly different or themed for shop owners
  padding: '1.5rem',
  borderRight: '1px solid var(--current-border-color)',
  flexShrink: 0,
};

const contentStyle: React.CSSProperties = {
  flexGrow: 1,
  padding: '1.5rem 2rem', // More padding for content area
  backgroundColor: 'var(--current-background)',
  overflowY: 'auto',
};

const navLinkStyle: React.CSSProperties = {
  display: 'block',
  padding: '0.75rem 1rem',
  marginBottom: '0.5rem',
  borderRadius: '6px',
  textDecoration: 'none',
  color: 'var(--text-color)',
  transition: 'background-color 0.2s ease, color 0.2s ease',
};

// const activeNavLinkStyle: React.CSSProperties = { // Example for active link
//   ...navLinkStyle,
//   backgroundColor: 'var(--primary-color)',
//   color: 'white',
//   fontWeight: '500',
// };


const ShopOwnerLayoutContent = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  // const pathname = usePathname(); // For active link styling

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'business_owner')) {
      // If not loading, and no user, or user is not a shop_owner, redirect.
      // router.replace('/auth/login?message=Access Denied. Please login as a Shop Owner.');
      // Showing access denied message is often better than silent redirect for UX.
      // For now, let the "Access Denied" message below handle it.
    }
  }, [user, authLoading, router]);


  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <p>Loading Shop Owner Area...</p>
      </div>
    );
  }

  if (!user || user.role !== 'business_owner') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--current-background)', minHeight: 'calc(100vh - 120px)' }}>
        <h2>Access Denied</h2>
        <p>You must be registered and logged in as a Shop Owner to access this section.</p>
        <Link href="/" className="button-style" style={{marginTop: '1rem'}}>Go to Homepage</Link>
        <br />
        <Link href="/auth/login" className="button-style secondary" style={{marginTop: '0.5rem'}}>Login</Link>
      </div>
    );
  }

  // User is authenticated and is a 'business_owner'
  return (
    <div style={specializedLayoutStyle}>
      <aside style={sidebarStyle}>
        <h3 style={{ color: 'var(--primary-dark)', marginBottom: '1.5rem', borderBottom: '1px solid var(--current-border-color)', paddingBottom: '0.5rem' }}>
          Shop Menu
        </h3>
        <nav>
          <Link href="/shop-owner/dashboard" style={navLinkStyle} /* activeStyle={pathname === '/shop-owner/dashboard' ? activeNavLinkStyle : {}} */ >
            Dashboard
          </Link>
          {/* Add more links as features are built, e.g.: */}
          {/* <Link href="/shop-owner/venues" style={navLinkStyle}>My Venues</Link> */}
          {/* <Link href="/shop-owner/profile" style={navLinkStyle}>Business Profile</Link> */}
          <p style={{fontSize: '0.85em', color: 'var(--text-color-muted)', marginTop: '1rem'}}>(More features coming soon!)</p>
        </nav>
      </aside>
      <main style={contentStyle}>
        {children}
      </main>
    </div>
  );
};


// This is the actual layout component exported for the /shop-owner route group
const ShopOwnerLayout = ({ children }: { children: ReactNode }) => {
    return (
        <AppProviders> {/* Ensures AuthContext and Apollo are available */}
            <MainLayout> {/* Nest within the main site layout (header, footer) */}
                <ShopOwnerLayoutContent>{children}</ShopOwnerLayoutContent>
            </MainLayout>
        </AppProviders>
    );
};

export default ShopOwnerLayout;
