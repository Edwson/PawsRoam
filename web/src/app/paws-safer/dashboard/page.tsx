// web/src/app/paws-safer/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import Image from 'next/image'; // For pet images in alerts
import Link from 'next/link'; // Import Link
// PawsSaferLayout will handle AppProviders, Layout, and auth guard

// const defaultPetImage = "/default-pet-avatar.png"; // Unused variable

// GraphQL query to fetch active pet alerts
const GET_ACTIVE_PET_ALERTS_QUERY = gql`
  query GetActivePetAlerts { # Assuming no geo-filter for V1 PawsSafer dashboard
    getActivePetAlerts {
      id
      alert_type
      description
      status
      latitude
      longitude
      pet_name
      pet_species
      pet_breed
      pet_image_url
      contact_phone
      contact_email
      last_seen_at
      created_at
      createdByUser {
        id
        name
        avatar_url # User avatar of reporter
      }
    }
  }
`;

// GraphQL mutation for updating alert status
const UPDATE_PET_ALERT_STATUS_MUTATION = gql`
  mutation UpdatePetAlertStatus($input: UpdatePetAlertStatusInput!) {
    updatePetAlertStatus(input: $input) {
      id
      status
      updated_at
      # Potentially resolved_at if status changed to 'resolved'
    }
  }
`;


// Define interfaces for the data
interface AlertUser {
    id: string;
    name?: string | null;
    avatar_url?: string | null;
}
interface PetAlert {
    id: string;
    alert_type: string;
    description: string;
    status: string;
    latitude: number;
    longitude: number;
    pet_name?: string | null;
    pet_species?: string | null;
    pet_breed?: string | null;
    pet_image_url?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    last_seen_at?: string | null;
    created_at: string;
    createdByUser?: AlertUser | null; // Optional because created_by_user_id can be null if user deleted
}


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

// const featureListStyle: React.CSSProperties = { // Unused variable
//   listStyle: 'disc', // Use disc for a more standard list look
//   paddingLeft: '20px', // Indent list items
// };

// const featureListItemStyle: React.CSSProperties = { // Unused variable
//   padding: '0.3rem 0',
//   color: 'var(--text-color-slightly-muted)', // Slightly muted for list items
// };

const alertCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--current-surface-accent)', // Slightly different background for cards
  padding: '1rem 1.5rem',
  borderRadius: '8px',
  marginBottom: '1rem',
  border: '1px solid var(--accent-light)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const PawsSaferDashboardPageContent: React.FC = () => {
  const [selectedAlertIdForNotes, setSelectedAlertIdForNotes] = useState<string | null>(null);
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success'|'error', message: string} | null>(null);

  const { data, loading, error, refetch } = useQuery<{ getActivePetAlerts: PetAlert[] }>(
    GET_ACTIVE_PET_ALERTS_QUERY,
    { fetchPolicy: 'cache-and-network' } // Ensure fresh data
  );

  const [updatePetAlertStatus, { loading: updateStatusLoading }] = useMutation(
    UPDATE_PET_ALERT_STATUS_MUTATION, {
      onCompleted: (data) => {
        setFeedbackMessage({type: 'success', message: `Alert ${data.updatePetAlertStatus.id} status updated to ${data.updatePetAlertStatus.status}.`});
        setSelectedAlertIdForNotes(null); // Close notes input
        setStatusUpdateNotes('');
        refetch(); // Refetch alerts
      },
      onError: (err) => {
        setFeedbackMessage({type: 'error', message: `Error updating status: ${err.message}`});
      }
    }
  );

  useEffect(() => {
    if(feedbackMessage) {
        const timer = setTimeout(() => setFeedbackMessage(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const handleStatusUpdate = (alertId: string, newStatus: string) => {
    if (selectedAlertIdForNotes === alertId && newStatus !== 'investigating') { // Prevent direct resolve/cancel if notes were for investigating
        // Allow direct resolve/cancel if notes not open for this specific alert or if it's for investigating
    }
    updatePetAlertStatus({ variables: { input: { alertId, newStatus, notes: statusUpdateNotes } } });
  };

  const toggleNotesInput = (alertId: string) => {
    if (selectedAlertIdForNotes === alertId) {
        setSelectedAlertIdForNotes(null); // Toggle off
        setStatusUpdateNotes('');
    } else {
        setSelectedAlertIdForNotes(alertId); // Open for this alert
        setStatusUpdateNotes(''); // Clear previous notes
    }
  };


  if (loading) return <p style={{textAlign: 'center', padding: '2rem'}}>Loading active alerts...</p>;
  if (error) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>Error loading alerts: {error.message}</p>;

  const alerts = data?.getActivePetAlerts || [];

  return (
    <div style={dashboardContainerStyle}>
      <h1 style={titleStyle}>🛡️ PawsSafer Network Dashboard</h1>
      <p style={textStyle}>
        Active pet emergency alerts in the area are listed below. Your quick attention can make a difference!
      </p>

      {feedbackMessage && (
        <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '4px', backgroundColor: feedbackMessage.type === 'success' ? 'var(--success-bg-color)' : 'var(--error-bg-color)', color: feedbackMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)', border: `1px solid ${feedbackMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`}}>
          {feedbackMessage.message}
        </div>
      )}

      <h2 style={{color: 'var(--accent-dark)', marginTop: '2rem', marginBottom: '1rem'}}>Active Alerts ({alerts.length})</h2>
      {alerts.length === 0 ? (
        <p>No active alerts at the moment. Great job, or a quiet day!</p>
      ) : (
        alerts.map(alert => (
          <Link key={alert.id} href={`/paws-safer/alerts/${alert.id}`} passHref style={{textDecoration: 'none', color: 'inherit'}}>
            <div style={{...alertCardStyle, cursor: 'pointer', transition: 'box-shadow 0.2s ease'}}
                 onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                 onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
            >
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                  <h3 style={{marginTop:0, marginBottom:'0.2rem', color: 'var(--accent-color)'}}>{alert.alert_type.replace('_', ' ').toUpperCase()} - {alert.pet_name || 'Unknown Pet'}</h3>
                  <span style={{fontSize:'0.8em', color: 'var(--text-color-muted)'}}>Reported: {new Date(alert.created_at).toLocaleDateString()}</span>
              </div>

              {alert.pet_image_url && (
                <Image src={alert.pet_image_url} alt={alert.pet_name || 'Pet image'} width={100} height={100} style={{objectFit:'cover', borderRadius:'4px', float:'right', marginLeft:'1rem', marginBottom:'0.5rem'}} onError={(e) => {(e.target as HTMLImageElement).style.display='none'}} />
            )}
            <p><strong>Description:</strong> <span style={{whiteSpace: 'pre-wrap'}}>{alert.description}</span></p>
            {alert.pet_species && <p><strong>Species:</strong> {alert.pet_species} {alert.pet_breed && `(${alert.pet_breed})`}</p>}
            {alert.last_seen_at && <p><strong>Last Seen:</strong> {new Date(alert.last_seen_at).toLocaleString()}</p>}
            <p><strong>Location:</strong> Approx. {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
            {(alert.contact_phone || alert.contact_email) && (
                <p><strong>Contact Reporter:</strong> {alert.contact_phone || ''} {alert.contact_phone && alert.contact_email && ' / '} {alert.contact_email || ''}</p>
            )}
             {alert.createdByUser && (
                <p style={{fontSize:'0.85em', color:'var(--text-color-muted)'}}>
                    Reported by: {alert.createdByUser.name || alert.createdByUser.id}
                </p>
            )}
            <p><strong>Status:</strong> <span style={{fontWeight:'bold'}}>{alert.status}</span></p>

            <div style={{marginTop: '1rem', borderTop: '1px dashed var(--accent-light)', paddingTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap:'wrap', alignItems:'center'}}>
              <button onClick={() => toggleNotesInput(alert.id)} className="button-style secondary small">
                {selectedAlertIdForNotes === alert.id ? 'Close Notes' : 'Add Notes/Update'}
              </button>
              {selectedAlertIdForNotes === alert.id && (
                 <button onClick={() => handleStatusUpdate(alert.id, 'investigating')} className="button-style small" disabled={updateStatusLoading} style={{backgroundColor: 'var(--info-color)'}}>
                    Set to Investigating
                </button>
              )}
               <button onClick={() => handleStatusUpdate(alert.id, 'resolved')} className="button-style small" disabled={updateStatusLoading} style={{backgroundColor: 'var(--success-color)'}}>
                Mark Resolved
              </button>
              {/* Add other status updates like 'cannot_help' or 'forward_to_authorities' if needed */}
            </div>
            {selectedAlertIdForNotes === alert.id && (
                <div style={{marginTop: '0.75rem'}}>
                    <textarea
                        value={statusUpdateNotes}
                        onChange={(e) => setStatusUpdateNotes(e.target.value)}
                        placeholder="Optional notes for status update..."
                        rows={2}
                        style={{width: '100%', padding:'0.5rem', borderRadius:'4px', border: '1px solid var(--current-border-color)', fontSize:'0.9rem'}}
                    />
                </div>
            )}
            </div>
          </Link>
        ))
      )}
    </div>
  );
};

// This page component will be wrapped by PawsSaferLayout
const PawsSaferDashboardPage = () => {
  return <PawsSaferDashboardPageContent />;
};

export default PawsSaferDashboardPage;
