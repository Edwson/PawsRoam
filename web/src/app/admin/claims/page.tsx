// web/src/app/admin/claims/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import Link from 'next/link';
import Image from 'next/image'; // For venue/user images if available
// AdminLayout will provide AppProviders, Layout, and auth guard

const defaultVenueImage = "/default-venue-image.png";
const defaultAvatar = "/default-avatar.png";

// GraphQL query to fetch venue claims
const ADMIN_GET_VENUE_CLAIMS_QUERY = gql`
  query AdminGetVenueClaims($status: String) {
    adminGetVenueClaims(status: $status) {
      id
      status
      claim_message
      admin_notes
      created_at
      updated_at
      user {
        id
        name
        email
        avatar_url
      }
      venue {
        id
        name
        image_url
        city
        owner_user_id # To see if it's already owned by someone else now
      }
    }
  }
`;

// GraphQL mutation for reviewing a claim
const ADMIN_REVIEW_VENUE_CLAIM_MUTATION = gql`
  mutation AdminReviewVenueClaim($input: AdminReviewVenueClaimInput!) {
    adminReviewVenueClaim(input: $input) {
      id
      status
      admin_notes
      venue { # For potential cache updates if owner_user_id changes
        id
        owner_user_id
      }
    }
  }
`;

interface ClaimUser {
  id: string;
  name?: string | null;
  email: string;
  avatar_url?: string | null;
}
interface ClaimVenue {
  id: string;
  name: string;
  image_url?: string | null;
  city?: string | null;
  owner_user_id?: string | null;
}
interface VenueClaim {
  id: string;
  status: string;
  claim_message?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  user: ClaimUser;
  venue: ClaimVenue;
}

// Styles (can be moved to a CSS module)
const claimCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--current-surface)',
  padding: '1.5rem',
  borderRadius: '8px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
  marginBottom: '1.5rem',
  border: '1px solid var(--current-border-color)',
};
const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--primary-dark)',
    marginTop: '1rem',
    marginBottom: '0.5rem',
    borderBottom: '1px solid var(--current-border-color)',
    paddingBottom: '0.3rem'
};


const AdminVenueClaimsPageContent: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('pending'); // Default to pending claims
  const [reviewingClaim, setReviewingClaim] = useState<VenueClaim | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success'|'error', message: string} | null>(null);

  const { data, loading, error, refetch } = useQuery<{ adminGetVenueClaims: VenueClaim[] }>(
    ADMIN_GET_VENUE_CLAIMS_QUERY,
    { variables: { status: filterStatus === 'all' ? null : filterStatus } }
  );

  const [adminReviewVenueClaim, { loading: reviewLoading }] = useMutation(ADMIN_REVIEW_VENUE_CLAIM_MUTATION, {
    onCompleted: (mutationData) => {
      setFeedbackMessage({type:'success', message: `Claim ${mutationData.adminReviewVenueClaim.id} status updated to ${mutationData.adminReviewVenueClaim.status}.`});
      setReviewingClaim(null);
      setAdminNotes('');
      refetch(); // Refetch claims list
      // Potentially refetch venue data if owner_user_id changed and it's cached elsewhere
    },
    onError: (err) => {
      setFeedbackMessage({type: 'error', message: `Error reviewing claim: ${err.message}`});
    }
  });

  useEffect(() => {
    if(feedbackMessage) {
        const timer = setTimeout(() => setFeedbackMessage(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);


  const handleStartReview = (claim: VenueClaim) => {
    setReviewingClaim(claim);
    setAdminNotes(claim.admin_notes || '');
    setFeedbackMessage(null);
  };

  const handleSubmitReview = (newStatus: 'approved' | 'rejected') => {
    if (!reviewingClaim) return;
    adminReviewVenueClaim({
      variables: {
        input: {
          claimId: reviewingClaim.id,
          newStatus,
          adminNotes: adminNotes.trim() === '' ? null : adminNotes.trim(),
        }
      }
    });
  };

  if (loading) return <p style={{textAlign: 'center', padding: '2rem'}}>Loading venue claims...</p>;
  if (error) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>Error loading claims: {error.message}</p>;

  const claims = data?.adminGetVenueClaims || [];

  return (
    <div>
      <h1 style={{color: 'var(--primary-color)'}}>Venue Ownership Claims</h1>

      {feedbackMessage && (
        <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '4px', backgroundColor: feedbackMessage.type === 'success' ? 'var(--success-bg-color)' : 'var(--error-bg-color)', color: feedbackMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)', border: `1px solid ${feedbackMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`}}>
          {feedbackMessage.message}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label htmlFor="statusFilter" style={{fontWeight: 500}}>Filter by status:</label>
        <select
          id="statusFilter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--current-border-color)'}}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {claims.length === 0 ? (
        <p>No claims found for the selected status.</p>
      ) : (
        claims.map((claim) => (
          <div key={claim.id} style={claimCardStyle}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                <div>
                    <h3 style={{marginTop:0, marginBottom:'0.2rem'}}>
                        Claim for: <Link href={`/venues/${claim.venue.id}`} target="_blank" style={{color: 'var(--primary-color)'}}>{claim.venue.name}</Link>
                    </h3>
                    <p style={{fontSize:'0.8em', color: 'var(--text-color-muted)', margin:0}}>Claim ID: {claim.id}</p>
                </div>
                <span style={{
                    padding: '0.3em 0.7em', borderRadius: '12px', fontSize: '0.85em', fontWeight: 500,
                    backgroundColor: claim.status === 'approved' ? 'var(--success-bg-color)' : (claim.status === 'pending' ? 'var(--warning-bg-color)' : 'var(--disabled-bg-color)'),
                    color: claim.status === 'approved' ? 'var(--success-color)' : (claim.status === 'pending' ? 'var(--warning-color)' : 'var(--disabled-text-color)'),
                }}>
                    {claim.status.replace('_', ' ')}
                </span>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem'}}>
                <div>
                    <h4 style={sectionTitleStyle}>Claimant Details</h4>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem'}}>
                        <Image src={claim.user.avatar_url || defaultAvatar} alt={claim.user.name || claim.user.email} width={40} height={40} style={{borderRadius: '50%', objectFit:'cover'}} />
                        <div>
                            <strong>{claim.user.name || 'N/A'}</strong><br/>
                            <small>{claim.user.email}</small> (<Link href={`/admin/users?search=${claim.user.id}`} target="_blank" style={{fontSize:'0.9em'}}>User ID</Link>)
                        </div>
                    </div>
                    {claim.claim_message && <p><strong>Message:</strong> <em style={{whiteSpace: 'pre-wrap'}}>{claim.claim_message}</em></p>}
                </div>
                <div>
                    <h4 style={sectionTitleStyle}>Venue Snapshot</h4>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem'}}>
                        <Image src={claim.venue.image_url || defaultVenueImage} alt={claim.venue.name} width={50} height={50} style={{objectFit:'cover', borderRadius:'4px'}}/>
                        <div>
                            <strong>{claim.venue.name}</strong><br/>
                            <small>{claim.venue.city || 'N/A'}</small> (<Link href={`/admin/venues/edit/${claim.venue.id}`} target="_blank" style={{fontSize:'0.9em'}}>Venue ID</Link>)
                        </div>
                    </div>
                    {claim.venue.owner_user_id && <p style={{fontSize:'0.9em', color: claim.venue.owner_user_id === claim.user.id ? 'var(--success-color)' : 'var(--error-color)'}}>Currently owned by: {claim.venue.owner_user_id === claim.user.id ? 'This Claimant' : claim.venue.owner_user_id}</p>}
                    {!claim.venue.owner_user_id && <p style={{fontSize:'0.9em', color: 'var(--text-color-muted)'}}>Currently unowned.</p>}
                </div>
            </div>

            <p style={{fontSize:'0.8em', color: 'var(--text-color-muted)'}}>Submitted: {new Date(claim.created_at).toLocaleString()}</p>
            {claim.status !== 'pending' && <p style={{fontSize:'0.8em', color: 'var(--text-color-muted)'}}>Reviewed: {new Date(claim.updated_at).toLocaleString()}</p>}
            {claim.admin_notes && <p><strong>Admin Notes:</strong> <em style={{whiteSpace: 'pre-wrap'}}>{claim.admin_notes}</em></p>}

            {claim.status === 'pending' && reviewingClaim?.id !== claim.id && (
              <button onClick={() => handleStartReview(claim)} className="button-style" style={{marginTop: '0.5rem'}}>Review Claim</button>
            )}

            {reviewingClaim?.id === claim.id && (
              <div style={{marginTop: '1rem', borderTop: '1px dashed var(--current-border-color)', paddingTop: '1rem'}}>
                <h4 style={{marginTop:0}}>Review Action:</h4>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Admin notes (optional for rejection, recommended for approval details or context)"
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--current-border-color)', marginBottom: '0.75rem', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => handleSubmitReview('approved')} className="button-style primary" disabled={reviewLoading || (claim.venue.owner_user_id && claim.venue.owner_user_id !== claim.user.id) }>
                    {reviewLoading ? 'Processing...' : 'Approve Claim'}
                  </button>
                  <button onClick={() => handleSubmitReview('rejected')} className="button-style danger" disabled={reviewLoading}>
                    {reviewLoading ? 'Processing...' : 'Reject Claim'}
                  </button>
                  <button onClick={() => setReviewingClaim(null)} className="button-style secondary" disabled={reviewLoading}>Cancel Review</button>
                </div>
                {claim.venue.owner_user_id && claim.venue.owner_user_id !== claim.user.id && <p className="error-message" style={{fontSize: '0.9em', marginTop: '0.5rem'}}>Cannot approve: Venue is already owned by another user ({claim.venue.owner_user_id}).</p>}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

const AdminVenueClaimsPage = () => {
    return <AdminVenueClaimsPageContent />;
}

export default AdminVenueClaimsPage;
