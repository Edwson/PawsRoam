// web/src/app/paws-safer/alerts/[alertId]/page.tsx
"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { gql, useQuery, useMutation } from '@apollo/client';
import Link from 'next/link';
import Image from 'next/image';
import AppProviders from '@/components/AppProviders';
import PawsSaferLayout from '@/app/paws-safer/layout';
import MainLayout from '@/components/Layout';
import MapDisplay from '@/components/MapDisplay'; // Import MapDisplay

const defaultPetImage = "/default-pet-avatar.png";
const defaultUserAvatar = "/default-avatar.png";

// GraphQL Query to get a specific Pet Alert by ID
const GET_PET_ALERT_BY_ID_QUERY = gql`
  query GetPetAlertById($alertId: ID!) {
    getPetAlertById(alertId: $alertId) {
      id
      alert_type
      description
      status
      latitude
      longitude
      location_accuracy
      pet_name
      pet_species
      pet_breed
      pet_image_url
      contact_phone
      contact_email
      last_seen_at
      resolved_at
      created_at
      updated_at
      createdByUser {
        id
        name
        email
        avatar_url
      }
    }
  }
`;

// Interfaces for the PetAlert data (can be moved to a types file)
interface AlertCreator {
  id: string;
  name?: string | null;
  email: string;
  avatar_url?: string | null;
}
interface PetAlertDetails {
  id: string;
  alert_type: string;
  description: string;
  status: string;
  latitude: number;
  longitude: number;
  location_accuracy?: number | null;
  pet_name?: string | null;
  pet_species?: string | null;
  pet_breed?: string | null;
  pet_image_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  last_seen_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  createdByUser?: AlertCreator | null;
}

// Basic styling (can be moved to a CSS module)
const detailContainerStyle: React.CSSProperties = { padding: '1.5rem', backgroundColor: 'var(--current-surface)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)'};
const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px dashed var(--current-border-color)'};
const titleStyle: React.CSSProperties = { color: 'var(--primary-color)', marginTop: 0, marginBottom: '1rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, color: 'var(--text-color-muted)', minWidth: '120px', display: 'inline-block' };
const mapPlaceholderStyle: React.CSSProperties = {
    height: '300px', width: '100%', backgroundColor: '#e9e9e9',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '4px', color: '#777', border: '1px solid #ccc',
    textAlign: 'center'
};


const AlertDetailPageContent: React.FC = () => {
  const params = useParams();
  const alertId = params.alertId as string;
  const router = useRouter(); // Not used currently, but good to have if needed for redirects

  const [statusUpdateNotes, setStatusUpdateNotes] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{type:'success'|'error', message:string}|null>(null);
  const [showNotesInputFor, setShowNotesInputFor] = useState<string|null>(null); // To toggle notes input for a status

  const { data, loading, error, refetch } = useQuery<{ getPetAlertById: PetAlertDetails | null }>(
    GET_PET_ALERT_BY_ID_QUERY,
    {
      variables: { alertId },
      skip: !alertId,
      fetchPolicy: 'cache-and-network', // Ensures data is fresh if navigating back
    }
  );

  const [updatePetAlertStatus, { loading: updateLoading }] = useMutation(
    gql`
      mutation UpdatePetAlertStatus($input: UpdatePetAlertStatusInput!) {
        updatePetAlertStatus(input: $input) {
          id
          status
          updated_at
          resolved_at
        }
      }
    `,
    {
      onCompleted: (data) => {
        setActionFeedback({type: 'success', message: `Alert status updated to ${data.updatePetAlertStatus.status}.`});
        refetch(); // Refetch alert details to show updated status and timestamps
        setShowNotesInputFor(null); // Close notes input
        setStatusUpdateNotes('');
        setTimeout(() => setActionFeedback(null), 4000);
      },
      onError: (err) => {
        setActionFeedback({type: 'error', message: `Failed to update status: ${err.message}`});
        setTimeout(() => setActionFeedback(null), 5000);
      }
    }
  );

  const handleStatusUpdate = (newStatus: string) => {
    if (!alertId) return;
    updatePetAlertStatus({
      variables: {
        input: {
          alertId,
          newStatus,
          notes: statusUpdateNotes.trim() === '' ? null : statusUpdateNotes.trim(),
        },
      },
    });
  };

  const toggleActionNotes = (actionStatus: string) => {
    if (showNotesInputFor === actionStatus) {
        setShowNotesInputFor(null); // Toggle off
        setStatusUpdateNotes('');
    } else {
        setShowNotesInputFor(actionStatus); // Open for this status
        setStatusUpdateNotes(''); // Clear previous notes
    }
  };


  if (loading) return <p style={{textAlign: 'center', padding: '2rem'}}>Loading alert details...</p>;
  if (error) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>Error loading alert: {error.message}</p>;
  if (!data?.getPetAlertById) return <p style={{textAlign: 'center', padding: '2rem'}}>Alert not found (ID: {alertId}). It may have been deleted or the ID is incorrect.</p>;

  const alert = data.getPetAlertById;

  const getStatusChipStyle = (status: string): React.CSSProperties => {
    let backgroundColor = 'var(--disabled-bg-color)';
    let color = 'var(--disabled-text-color)';
    if (status === 'active') { backgroundColor = 'var(--error-bg-color)'; color = 'var(--error-color)'; }
    else if (status === 'investigating') { backgroundColor = 'var(--info-bg-color)'; color = 'var(--info-color)'; }
    else if (status === 'resolved') { backgroundColor = 'var(--success-bg-color)'; color = 'var(--success-color)'; }
    return {
        padding: '0.3em 0.8em', borderRadius: '16px', fontSize: '0.9em', fontWeight: 500,
        backgroundColor, color, display: 'inline-block'
    };
  };

  const formatDateTime = (isoString?: string | null) => {
    return isoString ? new Date(isoString).toLocaleString() : 'N/A';
  }

  return (
    <div style={detailContainerStyle}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
        <h1 style={titleStyle}>Pet Alert Details</h1>
        <Link href="/paws-safer/dashboard" className="button-style secondary small">Back to Dashboard</Link>
      </div>

      <div style={sectionStyle}>
        <h3>
            <span style={{textTransform: 'capitalize'}}>{alert.alert_type.replace('_', ' ')}</span>
            {alert.pet_name && ` - ${alert.pet_name}`}
            <span style={{...getStatusChipStyle(alert.status), marginLeft: '1rem'}}>{alert.status.replace('_', ' ')}</span>
        </h3>
        <p><strong style={labelStyle}>Alert ID:</strong> {alert.id}</p>
        <p><strong style={labelStyle}>Description:</strong> <span style={{whiteSpace: 'pre-wrap'}}>{alert.description}</span></p>
      </div>

      {alert.pet_image_url && (
          <div style={{...sectionStyle, textAlign: 'center'}}>
            <Image src={alert.pet_image_url} alt={alert.pet_name || 'Pet in alert'} width={300} height={200} style={{objectFit: 'contain', borderRadius: '4px', maxHeight: '300px'}} onError={(e) => {(e.target as HTMLImageElement).style.display='none'}}/>
          </div>
      )}

      <div style={sectionStyle}>
        <h4>Pet Information</h4>
        <p><strong style={labelStyle}>Name:</strong> {alert.pet_name || 'N/A'}</p>
        <p><strong style={labelStyle}>Species:</strong> {alert.pet_species || 'N/A'}</p>
        <p><strong style={labelStyle}>Breed:</strong> {alert.pet_breed || 'N/A'}</p>
        <p><strong style={labelStyle}>Last Seen:</strong> {formatDateTime(alert.last_seen_at)}</p>
      </div>

      <div style={sectionStyle}>
        <h4>Location Details</h4>
        <p><strong style={labelStyle}>Coordinates:</strong> {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</p>
        {alert.location_accuracy && <p><strong style={labelStyle}>Accuracy:</strong> ~{alert.location_accuracy} meters</p>}
        <div style={{ height: '350px', width: '100%', marginTop: '1rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--current-border-color)' }}>
          <MapDisplay
            initialCenter={[alert.latitude, alert.longitude]}
            initialZoom={15}
            venues={[{ // Pass the alert location as a single "venue" for the marker
              id: alert.id,
              name: alert.pet_name ? `${alert.alert_type.replace('_',' ')} - ${alert.pet_name}` : alert.alert_type.replace('_',' '),
              latitude: alert.latitude,
              longitude: alert.longitude,
              type: alert.alert_type, // Use alert_type for the marker type if MapDisplay uses it
            }]}
            onViewReviews={() => {}} // No-op for this context
            // userLocation can be omitted if not relevant here or set to null
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <h4>Contact Information (for this alert)</h4>
        <p><strong style={labelStyle}>Phone:</strong> {alert.contact_phone || 'N/A'}</p>
        <p><strong style={labelStyle}>Email:</strong> {alert.contact_email || 'N/A'}</p>
      </div>

      {alert.createdByUser && (
        <div style={sectionStyle}>
          <h4>Reported By</h4>
          <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
            <Image src={alert.createdByUser.avatar_url || defaultUserAvatar} alt={alert.createdByUser.name || "User"} width={40} height={40} style={{borderRadius:'50%', objectFit:'cover'}} />
            <div>
                <p style={{margin:0}}>{alert.createdByUser.name || 'Anonymous User'}</p>
                <small style={{color: 'var(--text-color-muted)'}}>{alert.createdByUser.email}</small>
            </div>
          </div>
        </div>
      )}

      <div style={{fontSize: '0.85em', color: 'var(--text-color-muted)'}}>
        <p>Created: {formatDateTime(alert.created_at)} | Last Updated: {formatDateTime(alert.updated_at)}</p>
        {alert.resolved_at && <p style={{color: 'var(--success-color)'}}>Resolved: {formatDateTime(alert.resolved_at)}</p>}
      </div>

      <div style={{marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid var(--accent-color)'}}>
        <h3>PawsSafer Actions</h3>
        {actionFeedback && (
            <div style={{ padding: '0.8rem', marginBottom: '1rem', borderRadius: '4px',
                          backgroundColor: actionFeedback.type === 'success' ? 'var(--success-bg-color)' : 'var(--error-bg-color)',
                          color: actionFeedback.type === 'success' ? 'var(--success-color)' : 'var(--error-color)',
                          border: `1px solid ${actionFeedback.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`}}>
                {actionFeedback.message}
            </div>
        )}

        {alert.status === 'active' && (
            <button
                onClick={() => toggleActionNotes('investigating')}
                className="button-style"
                style={{backgroundColor: 'var(--info-color)', marginRight:'0.5rem'}}
                disabled={updateLoading}
            >
                {showNotesInputFor === 'investigating' ? 'Cancel Notes' : 'Start Investigating (Add Notes)'}
            </button>
        )}
        {alert.status === 'active' || alert.status === 'investigating' ? (
             <button
                onClick={() => toggleActionNotes('resolved')}
                className="button-style"
                style={{backgroundColor: 'var(--success-color)', marginRight:'0.5rem'}}
                disabled={updateLoading}
            >
                 {showNotesInputFor === 'resolved' && selectedAlertIdForNotes === alert.id ? 'Cancel Notes for Resolve' : 'Mark Resolved (Add Notes)'}
            </button>
        ) : null}
        {/* Could add a "Cannot Assist" or "Cancel (by PawsSafer)" button here too */}


        {showNotesInputFor && (
            <div style={{marginTop: '1rem'}}>
                <textarea
                    value={statusUpdateNotes}
                    onChange={(e) => setStatusUpdateNotes(e.target.value)}
                    placeholder={`Optional notes for setting status to "${showNotesInputFor}"...`}
                    rows={3}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--current-border-color)', marginBottom: '0.75rem', resize: 'vertical', fontSize: '0.95rem' }}
                />
                <button
                    onClick={() => handleStatusUpdate(showNotesInputFor)}
                    className="button-style primary"
                    disabled={updateLoading || !showNotesInputFor}
                >
                    {updateLoading ? 'Submitting...' : `Confirm: Set to ${showNotesInputFor.replace('_', ' ')}`}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};


// This page needs to be wrapped in PawsSaferLayout for route guarding and consistent UI
const PetAlertDetailPage = () => {
  return (
    <AppProviders> {/* Ensures Apollo Client is available */}
      <MainLayout> {/* Ensures main site header/footer */}
        <PawsSaferLayout> {/* Ensures PawsSafer specific sidebar and role check */}
          <AlertDetailPageContent />
        </PawsSaferLayout>
      </MainLayout>
    </AppProviders>
  );
};

export default PetAlertDetailPage;
