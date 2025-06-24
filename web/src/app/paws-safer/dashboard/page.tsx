// web/src/app/paws-safer/dashboard/page.tsx
"use client";

import React from 'react';

// Basic inline styles or import a CSS module if more complex styling is needed later
const dashboardContainerStyle: React.CSSProperties = {
  padding: '2rem',
  backgroundColor: 'var(--current-surface)', // Use theme variables
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
};

const titleStyle: React.CSSProperties = {
  color: 'var(--accent-color)', // Use accent color for PawsSafer theme
  marginBottom: '1rem',
  borderBottom: '2px solid var(--accent-light)',
  paddingBottom: '0.5rem',
};

const textStyle: React.CSSProperties = {
  lineHeight: '1.6',
  color: 'var(--text-color)',
  marginBottom: '1rem',
};

const featureListStyle: React.CSSProperties = {
  listStyle: 'disc', // Use disc for a more standard list look
  paddingLeft: '20px', // Indent list items
};

const featureListItemStyle: React.CSSProperties = {
  padding: '0.3rem 0',
  color: 'var(--text-color-slightly-muted)', // Slightly muted for list items
};

const PawsSaferDashboardPageContent: React.FC = () => {
  // Auth and role checks will be handled by the PawsSaferLayout

  return (
    <div style={dashboardContainerStyle}>
      <h1 style={titleStyle}>🛡️ PawsSafer Network Dashboard</h1>
      <p style={textStyle}>
        Welcome, PawsSafer! You are a vital part of our community&apos;s safety net for pets in distress.
      </p>
      <p style={textStyle}>
        This dashboard will be your hub for receiving alerts, managing your availability, and accessing resources to help pets in emergency situations.
      </p>

      <h2 style={{color: 'var(--accent-dark)', marginTop: '2rem', marginBottom: '1rem'}}>Upcoming Features:</h2>
      <ul style={featureListStyle}>
        <li style={featureListItemStyle}>View Active Emergency Alerts</li>
        <li style={featureListItemStyle}>Respond to Alerts / Offer Assistance</li>
        <li style={featureListItemStyle}>Manage Your Availability & Contact Radius</li>
        <li style={featureListItemStyle}>Access Emergency Pet Care Resources</li>
        <li style={featureListItemStyle}>View Past Assistance History</li>
      </ul>

      <p style={{...textStyle, marginTop: '2rem', fontSize: '0.9em', color: 'var(--text-color-muted)'}}>
        Thank you for your commitment to helping pets in need. More tools and features are coming soon!
      </p>
    </div>
  );
};

// This page component will be wrapped by PawsSaferLayout
const PawsSaferDashboardPage = () => {
  return <PawsSaferDashboardPageContent />;
};

export default PawsSaferDashboardPage;
