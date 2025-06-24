// web/src/app/profile/my-alerts/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Layout from '@/components/Layout';
import Image from 'next/image'; // For pet images in alerts
import Link from 'next/link';

const defaultPetImage = "/default-pet-avatar.png";

// GraphQL query to fetch alerts created by the current user
const GET_MY_CREATED_ALERTS_QUERY = gql`
  query GetMyCreatedAlerts {
    getMyCreatedAlerts {
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
      updated_at
      resolved_at
      # createdByUser is implicitly the current user, not strictly needed here but good for consistency
    }
  }
`;

// GraphQL mutation for cancelling an alert
const CANCEL_PET_ALERT_MUTATION = gql`
  mutation CancelPetAlert($alertId: ID!) {
    cancelPetAlert(alertId: $alertId) {
      id
      status # To confirm it's cancelled
    }
  }
`;

interface MyPetAlert {
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
    updated_at: string;
    resolved_at?: string | null;
}

// Styles can be shared or defined in a module
const pageContainerStyle: React.CSSProperties = {
  maxWidth: '900px',
  margin: '2rem auto',
  padding: '0 1rem', // No padding on container, cards will have it
};
const alertCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--current-surface)',
  padding: '1.5rem',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  marginBottom: '1.5rem',
  border: '1px solid var(--current-border-color)',
};


const MyAlertsPageContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success'|'error', message: string} | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?message=Please log in to view your alerts.');
    }
  }, [user, authLoading, router]);

  const { data, loading: queryLoading, error: queryError, refetch } = useQuery<{ getMyCreatedAlerts: MyPetAlert[] }>(
    GET_MY_CREATED_ALERTS_QUERY,
    {
      skip: !user || authLoading,
      fetchPolicy: 'cache-and-network',
    }
  );

  const [cancelPetAlert, { loading: cancelLoading }] = useMutation(CANCEL_PET_ALERT_MUTATION, {
    onCompleted: (data) => {
      setFeedbackMessage({type: 'success', message: `Alert successfully cancelled (ID: ${data.cancelPetAlert.id}).`});
      refetch(); // Refresh the list
    },
    onError: (err) => {
      setFeedbackMessage({type: 'error', message: `Error cancelling alert: ${err.message}`});
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('alertCreated') === 'true') {
      setFeedbackMessage({type: 'success', message: "New alert submitted successfully! It will be reviewed by PawsSafers."});
      // Clean the URL query parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
      const timer = setTimeout(() => setFeedbackMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, []); // Runs once on mount to check for query param

   useEffect(() => {
    if(feedbackMessage && !feedbackMessage.message.includes("New alert submitted")) { // Don't auto-clear the initial creation message too fast
        const timer = setTimeout(() => setFeedbackMessage(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);


  const handleCancelAlert = (alertId: string, alertDescription: string) => {
    if (window.confirm(`Are you sure you want to cancel the alert regarding "${alertDescription.substring(0,30)}..."? This action cannot be undone if the alert is still active.`)) {
      cancelPetAlert({ variables: { alertId } });
    }
  };

  if (authLoading || queryLoading) return <p style={{textAlign: 'center', padding: '2rem'}}>Loading your alerts...</p>;
  if (!user && !authLoading) return <p style={{textAlign: 'center', padding: '2rem'}}>Please log in to manage your alerts.</p>; // Should be redirected by useEffect
  if (queryError) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>Error loading your alerts: {queryError.message}</p>;

  const alerts = data?.getMyCreatedAlerts || [];

  return (
    <div style={pageContainerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{color: 'var(--primary-color)'}}>My Reported Alerts</h1>
        <Link href="/alerts/create" className="button-style primary">
          Create New Alert
        </Link>
      </div>

      {feedbackMessage && (
        <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '4px', backgroundColor: feedbackMessage.type === 'success' ? 'var(--success-bg-color)' : 'var(--error-bg-color)', color: feedbackMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)', border: `1px solid ${feedbackMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`}}>
          {feedbackMessage.message}
        </div>
      )}

      {alerts.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--current-surface)', borderRadius: '8px', border: '1px dashed var(--current-border-color)'}}>
          <p>You haven&apos;t created any pet alerts yet.</p>
        </div>
      ) : (
        alerts.map(alert => (
          <div key={alert.id} style={alertCardStyle}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                <h3 style={{marginTop:0, marginBottom:'0.2rem', color: alert.status === 'active' ? 'var(--error-color)' : (alert.status === 'resolved' ? 'var(--success-color)' : 'var(--text-color-muted')) }}>
                    {alert.alert_type.replace('_', ' ').toUpperCase()} - {alert.pet_name || 'Pet Details N/A'}
                </h3>
                <span style={{
                    padding: '0.3em 0.7em', borderRadius: '12px', fontSize: '0.85em', fontWeight: 500,
                    backgroundColor: alert.status === 'active' ? 'var(--error-bg-color)' : (alert.status === 'resolved' ? 'var(--success-bg-color)' : (alert.status === 'investigating' ? 'var(--info-bg-color)' : 'var(--disabled-bg-color)')),
                    color: alert.status === 'active' ? 'var(--error-color)' : (alert.status === 'resolved' ? 'var(--success-color)' : (alert.status === 'investigating' ? 'var(--info-color)' : 'var(--disabled-text-color)')),
                }}>
                    {alert.status.replace('_', ' ')}
                </span>
            </div>

            {alert.pet_image_url && (
                <Image src={alert.pet_image_url} alt={alert.pet_name || 'Pet image'} width={80} height={80} style={{objectFit:'cover', borderRadius:'4px', float:'right', marginLeft:'1rem', marginBottom:'0.5rem'}} onError={(e) => {(e.target as HTMLImageElement).style.display='none'}} />
            )}
            <p><strong>Description:</strong> <span style={{whiteSpace: 'pre-wrap'}}>{alert.description}</span></p>
            {alert.pet_species && <p><strong>Species:</strong> {alert.pet_species} {alert.pet_breed && `(${alert.pet_breed})`}</p>}
            {alert.last_seen_at && <p><strong>Last Seen/Occurred:</strong> {new Date(alert.last_seen_at).toLocaleString()}</p>}
            <p><strong>Location:</strong> Approx. {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
            {(alert.contact_phone || alert.contact_email) && (
                <p><strong>Public Contact:</strong> {alert.contact_phone || ''} {alert.contact_phone && alert.contact_email && ' / '} {alert.contact_email || ''}</p>
            )}
            <p style={{fontSize:'0.8em', color: 'var(--text-color-muted)'}}>Reported: {new Date(alert.created_at).toLocaleString()} | Updated: {new Date(alert.updated_at).toLocaleString()}</p>
            {alert.resolved_at && <p style={{fontSize:'0.8em', color: 'var(--success-color)'}}>Resolved: {new Date(alert.resolved_at).toLocaleString()}</p>}

            {alert.status === 'active' && (
              <div style={{marginTop: '1rem', borderTop: '1px dashed var(--current-border-color)', paddingTop: '1rem'}}>
                <button
                    onClick={() => handleCancelAlert(alert.id, alert.description)}
                    className="button-style danger small"
                    disabled={cancelLoading}
                >
                  {cancelLoading ? 'Cancelling...' : 'Cancel This Alert'}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

const MyAlertsPage = () => {
  return (
    <AppProviders>
      <Layout>
        <MyAlertsPageContent />
      </Layout>
    </AppProviders>
  );
};

export default MyAlertsPage;
