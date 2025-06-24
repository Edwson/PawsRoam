'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Import NextImage

// Define some basic styles directly in the component or import from a CSS module
const headerStyle: React.CSSProperties = {
  padding: '1rem 2rem',
  backgroundColor: 'var(--current-surface)',
  borderBottom: '1px solid var(--current-border-color)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
};

const logoStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: 'var(--primary-color)', // Use primary color for logo
  fontSize: '1.5rem', // h1 is now in globals, this is for the link itself
  fontWeight: 'bold',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem', // Use gap for spacing between nav items
};

const navLinkStyle: React.CSSProperties = {
  // color: 'var(--current-foreground)', // Already handled by global 'a' styles
  textDecoration: 'none',
  padding: '0.5rem 0.75rem',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
};

const navLinkActiveStyle: React.CSSProperties = { // Example for active link (needs path checking)
  ...navLinkStyle,
  // backgroundColor: 'var(--primary-light)',
  // color: 'var(--primary-dark)',
  fontWeight: '500',
};

const mainStyle: React.CSSProperties = {
  padding: '2rem',
  flexGrow: 1, // Ensure main content takes available space
  maxWidth: '1200px', // Max width for content area
  width: '100%',
  marginLeft: 'auto',
  marginRight: 'auto',
};

const footerStyle: React.CSSProperties = {
  padding: '1.5rem 2rem',
  backgroundColor: 'var(--current-surface)',
  borderTop: '1px solid var(--current-border-color)',
  textAlign: 'center',
  color: 'var(--text-color-muted)',
  fontSize: '0.9rem',
  marginTop: 'auto', // Push footer to bottom if content is short
};

const appContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh', // Ensure footer is at bottom even with short content
};


interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  // const pathname = usePathname(); // For active link styling if needed

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading application...</div>;
  }

  return (
    <div style={appContainerStyle}>
      <header style={headerStyle}>
        <Link href="/" style={logoStyle}>
          🐾 PawsRoam
        </Link>
        <nav style={navStyle}>
          <Link href="/" style={navLinkStyle}>Home</Link>
          <Link href="/map" style={navLinkStyle}>Map Discovery</Link>
          <Link href="/ai-pet-care" style={navLinkStyle}>Pet Care AI</Link>
          {user ? (
            <>
              {user.role === 'business_owner' && (
                <Link href="/shop-owner/dashboard" style={navLinkStyle}>Shop Dashboard</Link>
              )}
              {user.role === 'admin' && (
                 <Link href="/admin" style={navLinkStyle}>Admin</Link>
              )}
              {user.avatar_url ? (
                <Link href="/profile" passHref>
                  <a style={{ ...navLinkStyle, padding: '0.2rem', borderRadius: '50%', display: 'flex', alignItems: 'center' }}>
                    <Image
                      src={user.avatar_url}
                      alt="My Avatar"
                      width={36} // Adjust size as needed
                      height={36}
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }} // Fallback
                    />
                  </a>
                </Link>
              ) : (
                <Link href="/profile" style={navLinkStyle}>
                    {/* Fallback icon or initials if no avatar_url */}
                    <span style={{border: '1px solid var(--current-border-color)', borderRadius: '50%', width: '36px', height: '36px', display: 'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem'}}>
                        {user.name ? user.name.substring(0,1).toUpperCase() : user.email.substring(0,1).toUpperCase()}
                    </span>
                </Link>
              )}
              {/* <Link href="/profile" style={navLinkStyle}>Profile</Link> */}
              <button onClick={handleLogout} className="button-style secondary">Logout</button>
              {/* <span style={{ fontStyle: 'italic', color: 'var(--text-color-muted)' }}>Welcome, {user.name || user.email}!</span> */}
            </>
          ) : (
            <>
              <Link href="/auth/login" style={navLinkStyle}>Login</Link>
              <Link href="/auth/register" className="button-style">Register</Link>
            </>
          )}
        </nav>
      </header>
      <main style={mainStyle}>
        {children}
      </main>
      <footer style={footerStyle}>
        <p>&copy; {new Date().getFullYear()} PawsRoam. All rights reserved. Crafted with ❤️ for our furry friends.</p>
      </footer>
    </div>
  );
};

export default Layout;
