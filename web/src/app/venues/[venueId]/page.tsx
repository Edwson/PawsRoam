// Basic structure for Venue Detail Page
// web/src/app/venues/[venueId]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import { gql, useQuery } from '@apollo/client';
import Link from 'next/link'; // For linking back or to other pages

// Components to integrate
import ReviewList from '@/components/reviews/ReviewList';
import AddReviewForm from '@/components/forms/AddReviewForm';
import AppProviders from '@/components/AppProviders'; // For Apollo Client context if not global
import Layout from '@/components/Layout'; // Standard page layout

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
      # Add other fields as needed based on your Venue GQL type
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
}

const VenueDetailPageContent = () => {
  const params = useParams();
  const venueId = params.venueId as string; // Ensure venueId is a string

  const { data, loading, error, refetch: refetchVenue } = useQuery<{ getVenueById: Venue }>(
    GET_VENUE_BY_ID,
    {
      variables: { id: venueId },
      skip: !venueId, // Skip query if venueId is not yet available
    }
  );

  const handleReviewAdded = () => {
    refetchVenue(); // Refetch venue data to update review list and average rating
  };

  if (loading) return <p>Loading venue details...</p>;
  if (error) return <p>Error loading venue: {error.message}</p>;
  if (!data || !data.getVenueById) return <p>Venue not found.</p>;

  const venue = data.getVenueById;

  return (
    <div style={{ padding: '20px' }}>
      <Link href="/map">&larr; Back to Map</Link>
      <h1>{venue.name}</h1>
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
