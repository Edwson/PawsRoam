// web/src/app/shop-owner/venues/edit/[venueId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { gql, useQuery, useMutation, ApolloCache, useApolloClient } from '@apollo/client'; // Added useMutation
// ShopOwnerLayout will provide AppProviders and the main Layout wrapper
import VenueForm from '@/components/admin/venues/VenueForm'; // Reusing the admin form
import VenueImageUpload from '@/components/admin/venues/VenueImageUpload'; // Reusing the admin image uploader
import { Venue as VenueType, ShopOwnerUpdateVenueInput } from '@/lib/types'; // Import types
import { useAuth } from '@/contexts/AuthContext';

// Query to fetch venue data for editing by owner
const GET_VENUE_BY_ID_FOR_OWNER_EDIT = gql`
  query GetVenueByIdForOwnerEdit($id: ID!) {
    # We can use getVenueById, ownership check will be primarily in mutation resolvers
    # Or, if we had a specific query like getMyOwnedVenueById(id: ID!) that would be better.
    # For now, using generic getVenueById and relying on UI/mutation checks.
    getVenueById(id: $id) {
      id
      owner_user_id # Important for client-side check if needed, though backend enforces
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
      status # Display read-only for shop owner
      google_place_id
      image_url
    }
  }
`;

const SHOP_OWNER_DELETE_VENUE_MUTATION = gql`
  mutation ShopOwnerDeleteVenue($venueId: ID!) {
    shopOwnerDeleteVenue(venueId: $venueId)
  }
`;

const EditVenueByShopOwnerPageContent: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;
  const apolloClient = useApolloClient();
  const { user } = useAuth();

  const [currentVenue, setCurrentVenue] = useState<VenueType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  const { loading, error: queryError, data, refetch: refetchVenueData } = useQuery<{ getVenueById: VenueType }>(
    GET_VENUE_BY_ID_FOR_OWNER_EDIT,
    {
      variables: { id: venueId },
      skip: !venueId || !user, // Skip if no venueId or user not loaded
      onCompleted: (queryData) => {
        if (queryData?.getVenueById) {
          if (queryData.getVenueById.owner_user_id !== user?.id) {
            setErrorMessage("Access Denied: You do not own this venue.");
            setCurrentVenue(null);
          } else {
            setCurrentVenue(queryData.getVenueById);
          }
        } else {
          setErrorMessage("Venue not found.");
        }
      },
      onError: (err) => {
        setErrorMessage(`Error fetching venue: ${err.message}`);
      }
    }
  );

  const [shopOwnerDeleteVenue, { loading: deleteLoading }] = useMutation(SHOP_OWNER_DELETE_VENUE_MUTATION, {
    onCompleted: (data) => {
      if (data.shopOwnerDeleteVenue) {
        setSuccessMessage("Venue deleted successfully. Redirecting to My Venues...");
        setTimeout(() => router.push('/shop-owner/venues?venueDeleted=true'), 2000);
      } else {
        setErrorMessage("Failed to delete venue, or venue not found for deletion.");
      }
    },
    onError: (err) => {
      setErrorMessage(`Error deleting venue: ${err.message}`);
    },
    // Refetch MyOwnedVenues list after deletion
    refetchQueries: [ { query: gql`query MyOwnedVenues { myOwnedVenues { id name } }` } ], // Simplified refetch query
    // Or update cache manually
  });

  const handleDetailsUpdateSuccess = () => {
    setSuccessMessage("Venue details updated successfully!");
    refetchVenueData(); // Refetch to ensure all data is fresh
    setTimeout(() => setSuccessMessage(null), 3000);
    // Optionally, could redirect to '/shop-owner/venues' or stay on page
  };

  const handleImageUploadSuccess = (newImageUrl: string) => {
     setSuccessMessage("Venue image updated successfully!");
    if (currentVenue) {
      const updatedVenueData = { ...currentVenue, image_url: newImageUrl };
      setCurrentVenue(updatedVenueData);
      apolloClient.writeQuery({
        query: GET_VENUE_BY_ID_FOR_OWNER_EDIT,
        variables: { id: venueId },
        data: { getVenueById: updatedVenueData },
      });
    }
     setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (loading && !currentVenue) return <p style={{textAlign: 'center', padding: '2rem'}}>Loading venue details...</p>;
  if (queryError && !currentVenue && !loading) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>{errorMessage || queryError.message}</p>;
  if (!venueId) return <p style={{textAlign: 'center', padding: '2rem'}}>No Venue ID provided.</p>;
  if (!currentVenue && !loading) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>{errorMessage || "Venue data could not be loaded or access denied."}</p>;

  // Explicit check again after loading, in case initial user was null
  if (currentVenue && currentVenue.owner_user_id !== user?.id) {
    return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>{errorMessage || "Access Denied: You do not own this venue."}</p>;
  }

  const handleDeleteVenue = () => {
    if (!currentVenue) return;
    if (window.confirm(`Are you sure you want to permanently delete venue "${currentVenue.name}"? This action cannot be undone.`)) {
      shopOwnerDeleteVenue({ variables: { venueId: currentVenue.id } });
    }
  };


  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--current-border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
        <h1 style={{color: 'var(--primary-color)'}}>
          Edit Venue: {currentVenue?.name || `(ID: ${venueId})`}
        </h1>
        <Link href="/shop-owner/venues" className="button-style secondary">Back to My Venues</Link>
      </div>

      {successMessage && (
        <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '4px', backgroundColor: 'var(--success-bg-color)', color: 'var(--success-color)', border: '1px solid var(--success-color)'}}>
          {successMessage}
        </div>
      )}
      {errorMessage && currentVenue?.owner_user_id === user?.id && <p className="error-message">{errorMessage}</p>}


      <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', flexWrap: 'wrap-reverse' }}>
        <div style={{ flex: '2 1 450px', minWidth: '300px' }}>
          <h3 style={{marginTop: 0}}>Venue Details</h3>
          {currentVenue && (
            <VenueForm
              venueId={venueId}
              mutationType="shopOwnerUpdateVenueDetails" // Specific mutation for shop owner updates
              onSuccess={handleDetailsUpdateSuccess}
              // Pass initialData to VenueForm to prefill. VenueForm's internal fetch will still run but this ensures faster prefill.
              // initialData prop would need to be added to VenueForm if we want to pass it directly.
              // For now, VenueForm fetches its own data based on venueId.
            />
          )}
        </div>
        <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
          <h3 style={{marginTop: 0}}>Venue Image</h3>
          {currentVenue && (
            <VenueImageUpload
              venueId={venueId}
              currentImageUrl={currentVenue.image_url}
              onUploadSuccess={handleImageUploadSuccess}
              mutationType="shopOwnerUpdateVenueImage" // Specify the correct mutation
            />
          )}
        </div>
      </div>

      {currentVenue && (
        <div style={{marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--current-border-color)'}}>
            <h3 style={{color: 'var(--error-color)'}}>Danger Zone</h3>
            <p style={{fontSize: '0.9em', color: 'var(--text-color-muted)'}}>
                Deleting your venue is permanent and will remove all its data, including reviews.
                This action cannot be undone.
            </p>
            <button
                onClick={handleDeleteVenue}
                className="button-style danger"
                disabled={deleteLoading}
                style={{marginTop: '0.5rem'}}
            >
                {deleteLoading ? 'Deleting...' : 'Delete This Venue Permanently'}
            </button>
        </div>
      )}
    </div>
  );
};

const EditVenueByShopOwnerPage = () => {
    return <EditVenueByShopOwnerPageContent />;
}

export default EditVenueByShopOwnerPage;
