// web/src/app/admin/venues/edit/[venueId]/page.tsx
"use client";

import React, { useState } from 'react'; // Removed useEffect
import { useParams } from 'next/navigation';
import { gql, useQuery, useApolloClient } from '@apollo/client'; // Removed ApolloCache
import Layout from '@/components/Layout';
import AppProviders from '@/components/AppProviders';
import VenueForm from '@/components/admin/venues/VenueForm';
import VenueImageUpload from '@/components/admin/venues/VenueImageUpload'; // Import the new component
import { Venue as VenueType } from '@/lib/types'; // Import Venue type

// Query used by VenueForm, ensure it's defined or imported if VenueForm doesn't export it.
// For clarity, defining it here if it's specific to this page's needs for data management.
const GET_VENUE_BY_ID_FOR_EDIT_PAGE = gql`
  query GetVenueByIdForAdminEdit($id: ID!) {
    getVenueById(id: $id) {
      id
      owner_user_id
      name
      address
      city
      state_province
      postal_code
      country
      latitude
      longitude
      phone_number
      website
      description
      opening_hours
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
      status
      google_place_id
      image_url # Crucial for the image uploader
    }
  }
`;


const EditVenuePageContent: React.FC = () => {
  const params = useParams();
  const venueId = params.venueId as string;
  const apolloClient = useApolloClient();

  const [currentVenue, setCurrentVenue] = useState<VenueType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { loading, error: queryError, /* data */ } = useQuery<{ getVenueById: VenueType }>( // data was unused
    GET_VENUE_BY_ID_FOR_EDIT_PAGE,
    {
      variables: { id: venueId },
      skip: !venueId,
      onCompleted: (queryData) => {
        if (queryData?.getVenueById) {
          setCurrentVenue(queryData.getVenueById);
        } else {
          setErrorMessage("Venue not found.");
        }
      },
      onError: (err) => {
        setErrorMessage(`Error fetching venue: ${err.message}`);
      }
    }
  );

  const handleImageUploadSuccess = (newImageUrl: string) => {
    if (currentVenue) {
      const updatedVenue = { ...currentVenue, image_url: newImageUrl };
      setCurrentVenue(updatedVenue);

      // Manually update Apollo cache for this query
      apolloClient.writeQuery({
        query: GET_VENUE_BY_ID_FOR_EDIT_PAGE,
        variables: { id: venueId },
        data: { getVenueById: updatedVenue },
      });
      // Potentially update other queries like the admin venue list if it shows images
    }
  };

  // This useEffect is to reset currentVenue if venueId changes (though unlikely on a static edit page)
  // More importantly, it handles the case where data is refetched and VenueForm might need to be re-keyed or explicitly updated.
  // For now, VenueForm takes venueId and fetches its own data. If VenueForm were to take `currentVenue` as a prop,
  // this would be where we pass the updated `currentVenue` to it.
  // Given VenueForm fetches its own data based on venueId, this might not be strictly needed for VenueForm itself,
  // but setCurrentVenue helps keep this page's state aligned.

  if (loading && !currentVenue) return <p style={{textAlign: 'center', padding: '2rem'}}>Loading venue details...</p>;
  if (queryError && !currentVenue) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>{errorMessage || queryError.message}</p>;
  if (!venueId) return <p>No Venue ID provided.</p>; // Should not happen with Next.js routing
  if (!currentVenue && !loading) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>{errorMessage || "Venue data could not be loaded."}</p>;


  return (
    <div>
      <h2 style={{borderBottom: '1px solid var(--current-border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
        Edit Venue: {currentVenue?.name || `(ID: ${venueId})`}
      </h2>

      {errorMessage && (!currentVenue || currentVenue.id !== venueId) && <p className="error-message">{errorMessage}</p>}

      <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', flexWrap: 'wrap-reverse' }}>
        <div style={{ flex: '2 1 450px', minWidth: '300px' }}>
          <VenueForm venueId={venueId} />
        </div>
        <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
          {currentVenue && (
            <VenueImageUpload
              venueId={venueId}
              currentImageUrl={currentVenue.image_url}
              onUploadSuccess={handleImageUploadSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const EditVenuePage = () => {
  return (
    <AppProviders>
      {/* AdminRouteGuard is handled by admin/layout.tsx */}
      <Layout>
        <EditVenuePageContent />
      </Layout>
    </AppProviders>
  );
};

export default EditVenuePage;
