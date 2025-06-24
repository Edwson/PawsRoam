// Basic structure for Venue Detail Page
// web/src/app/venues/[venueId]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import { gql, useQuery, useMutation } from '@apollo/client'; // Added useMutation
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth
import React, { useState } from 'react'; // Added useState for modal

// Components to integrate
import ReviewList from '@/components/reviews/ReviewList';
import AddReviewForm from '@/components/forms/AddReviewForm';
import AppProviders from '@/components/AppProviders'; // For Apollo Client context if not global
import Layout from '@/components/Layout'; // Standard page layout
import Image from 'next/image'; // Import Image component

const defaultVenueImage = "/default-venue-image.png"; // Define default image


// Define GraphQL query for fetching a single venue by ID
// This query should align with your backend schema and include reviews
const GET_VENUE_BY_ID = gql`
  query GetVenueById($id: ID!) {
    getVenueById(id: $id) {
      id
      name
      description
      address
      city
      state_province
      postal_code
      country
      latitude
      longitude
      phone_number
      website
      type
      pet_policy_summary
      pet_policy_details
      allows_off_leash
      has_indoor_seating_for_pets
      has_outdoor_seating_for_pets
      water_bowls_provided
      pet_treats_available
      pet_menu_available
      dedicated_pet_area
      weight_limit_kg
      carrier_required
      additional_pet_services
      average_rating
      review_count
      image_url # Fetch image_url
      owner_user_id # Fetch owner_user_id to check if venue is already owned
      reviews {
        id
        rating
        comment
        visit_date
        user {
          id
          name
        }
        created_at
      }
    }
  }
`;

// Define the expected type for the venue data based on the query
interface User {
  id: string;
  name?: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  visit_date?: string | null; // Assuming YYYY-MM-DD
  user: User;
  created_at: string; // ISO Date string
}

interface Venue {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
  phone_number?: string | null;
  website?: string | null;
  type: string;
  pet_policy_summary?: string | null;
  pet_policy_details?: string | null;
  allows_off_leash?: boolean | null;
  has_indoor_seating_for_pets?: boolean | null;
  has_outdoor_seating_for_pets?: boolean | null;
  water_bowls_provided?: boolean | null;
  pet_treats_available?: boolean | null;
  pet_menu_available?: boolean | null;
  dedicated_pet_area?: boolean | null;
  weight_limit_kg?: number | null;
  carrier_required?: boolean | null;
  additional_pet_services?: string | null;
  average_rating?: number | null;
  review_count?: number | null;
  reviews: Review[];
  image_url?: string | null;
  owner_user_id?: string | null; // Add to interface
}

const REQUEST_VENUE_CLAIM_MUTATION = gql`
  mutation RequestVenueClaim($input: RequestVenueClaimInput!) {
    requestVenueClaim(input: $input) {
      id
      status
      venue { id name }
      user { id name }
    }
  }
`;

const VenueDetailPageContent = () => {
  const params = useParams();
  const { user: currentUser } = useAuth(); // Get current user for role check
  const venueId = params.venueId as string;

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimFeedback, setClaimFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const { data, loading, error, refetch: refetchVenue } = useQuery<{ getVenueById: Venue }>(
    GET_VENUE_BY_ID,
    {
      variables: { id: venueId },
      skip: !venueId,
    }
  );

  const [requestVenueClaim, { loading: claimLoading }] = useMutation(REQUEST_VENUE_CLAIM_MUTATION, {
    onCompleted: (data) => {
      setClaimFeedback({ type: 'success', message: `Claim for "${data.requestVenueClaim.venue.name}" submitted! Status: ${data.requestVenueClaim.status}. Admin will review it.` });
      setIsClaimModalOpen(false);
      setClaimMessage('');
      // Optionally refetch venue data if claim status should be shown on page, or disable button etc.
      // For now, just show message and close modal.
    },
    onError: (err) => {
      setClaimFeedback({ type: 'error', message: `Claim submission failed: ${err.message}` });
    }
  });

  const handleReviewAdded = () => {
    refetchVenue();
  };

  const handleOpenClaimModal = () => {
    setClaimFeedback(null);
    setIsClaimModalOpen(true);
  };

  const handleCloseClaimModal = () => {
    setIsClaimModalOpen(false);
    setClaimMessage('');
  };

  const handleSubmitClaim = () => {
    if (!venueId) return;
    requestVenueClaim({ variables: { input: { venueId, claimMessage: claimMessage.trim() === '' ? null : claimMessage.trim() } } });
  };

  if (loading) return <p style={{textAlign: 'center', padding: '2rem'}}>Loading venue details...</p>;
  if (error) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>Error loading venue: {error.message}</p>;
  if (!data || !data.getVenueById) return <p style={{textAlign: 'center', padding: '2rem'}}>Venue not found.</p>;

  const venue = data.getVenueById;
  const canClaimVenue = currentUser?.role === 'business_owner' && !venue.owner_user_id;

  return (
    <div style={{ padding: '20px' }}>
      <Link href="/map" style={{ display: 'inline-block', marginBottom: '1rem' }}>&larr; Back to Map</Link>

      {claimFeedback && (
        <div style={{
          padding: '1rem', marginBottom: '1rem', borderRadius: '4px',
          backgroundColor: claimFeedback.type === 'success' ? 'var(--success-bg-color)' : 'var(--error-bg-color)',
          color: claimFeedback.type === 'success' ? 'var(--success-color)' : 'var(--error-color)',
          border: `1px solid ${claimFeedback.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`
        }}>
          {claimFeedback.message}
        </div>
      )}

      {venue.image_url && (
        <div style={{ marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <Image
            src={venue.image_url}
            alt={`Image of ${venue.name}`}
            width={800} // Adjust width as needed for page layout
            height={450} // Adjust height for a 16:9 aspect ratio, or as desired
            style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} // Hide if image fails to load
            priority // Prioritize loading if it's LCP
          />
        </div>
      )}

      <h1>{venue.name}</h1>
      {canClaimVenue && (
        <button onClick={handleOpenClaimModal} className="button-style primary" style={{marginLeft: '1rem', marginBottom: '1rem', float: 'right'}}>
          Claim This Venue
        </button>
      )}
      {venue.owner_user_id && currentUser?.id === venue.owner_user_id && (
        <span style={{fontSize: '0.9em', color: 'var(--success-color)', marginLeft: '1rem', float: 'right', border: '1px solid', padding: '0.5rem 0.8rem', borderRadius: '4px'}}>✓ You own this venue</span>
      )}
       {venue.owner_user_id && currentUser?.id !== venue.owner_user_id && (
        <span style={{fontSize: '0.9em', color: 'var(--text-color-muted)', marginLeft: '1rem', float: 'right', border: '1px solid', padding: '0.5rem 0.8rem', borderRadius: '4px'}}>Owned by another member</span>
      )}
      <div style={{clear:'both'}}></div>

      <p><strong>Type:</strong> {venue.type}</p>
      <p><strong>Address:</strong> {`${venue.address || ''}, ${venue.city || ''}, ${venue.state_province || ''} ${venue.postal_code || ''}, ${venue.country || ''}`.replace(/ , |^, | ,$/g, '') || 'N/A'}</p>
      {venue.website && <p><strong>Website:</strong> <a href={venue.website} target="_blank" rel="noopener noreferrer">{venue.website}</a></p>}
      {venue.phone_number && <p><strong>Phone:</strong> {venue.phone_number}</p>}
      {venue.description && <p><strong>Description:</strong> {venue.description}</p>}

      <h2>Pet Policies</h2>
      <p>{venue.pet_policy_summary || 'No summary provided.'}</p>
      {venue.pet_policy_details && <details><summary>Details</summary><p>{venue.pet_policy_details}</p></details>}
      <ul>
        <li>Allows Off-Leash: {venue.allows_off_leash ? 'Yes' : 'No'}</li>
        <li>Indoor Seating for Pets: {venue.has_indoor_seating_for_pets ? 'Yes' : 'No'}</li>
        <li>Outdoor Seating for Pets: {venue.has_outdoor_seating_for_pets ? 'Yes' : 'No'}</li>
        <li>Water Bowls Provided: {venue.water_bowls_provided ? 'Yes' : 'No'}</li>
        <li>Pet Treats Available: {venue.pet_treats_available ? 'Yes' : 'No'}</li>
        <li>Pet Menu Available: {venue.pet_menu_available ? 'Yes' : 'No'}</li>
        <li>Dedicated Pet Area: {venue.dedicated_pet_area ? 'Yes' : 'No'}</li>
        {venue.weight_limit_kg !== null && <li>Weight Limit: {venue.weight_limit_kg} kg</li>}
        <li>Carrier Required: {venue.carrier_required ? 'Yes' : 'No'}</li>
      </ul>
      {venue.additional_pet_services && <p><strong>Additional Services:</strong> {venue.additional_pet_services}</p>}

      <h2>Reviews ({venue.review_count || 0})</h2>
      <p>Average Rating: {venue.average_rating ? venue.average_rating.toFixed(1) : 'N/A'} / 5</p>

      <AddReviewForm venueId={venue.id} onReviewAdded={handleReviewAdded} />
      <ReviewList reviews={venue.reviews} />

      {isClaimModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ backgroundColor: 'var(--current-surface)', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '90%', maxWidth: '500px' }}>
            <h3>Request to Claim &quot;{venue.name}&quot;</h3>
            <p>If you are the owner or an authorized representative of this venue, you can request to claim it. Please provide a brief message for the admin team if you wish.</p>
            <textarea
              value={claimMessage}
              onChange={(e) => setClaimMessage(e.target.value)}
              placeholder="Optional: e.g., I am the manager, here is our business registration..."
              rows={4}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--current-border-color)', marginBottom: '1rem', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={handleCloseClaimModal} className="button-style secondary" disabled={claimLoading}>Cancel</button>
              <button onClick={handleSubmitClaim} className="button-style primary" disabled={claimLoading}>
                {claimLoading ? 'Submitting...' : 'Submit Claim Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// It's good practice to wrap page content with providers if they aren't globally available
// or if this page needs specific context setup.
// For Next.js App Router, if AppProviders is in your root layout, this might not be strictly needed here.
const VenueDetailPage = () => {
  return (
    <AppProviders> {/* Ensure ApolloProvider is available */}
      <Layout>
        <VenueDetailPageContent />
      </Layout>
    </AppProviders>
  );
};

export default VenueDetailPage;
