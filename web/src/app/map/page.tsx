'use client';

import React, { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import MapDisplay from '@/components/MapDisplay';
import ReviewModal from '@/components/modals/ReviewModal'; // Import ReviewModal

// Define the GraphQL query for searching venues
const SEARCH_VENUES_QUERY = gql`
  query SearchVenues($filterByName: String, $filterByType: String) {
    searchVenues(filterByName: $filterByName, filterByType: $filterByType) {
      id
      name
      address
      city
      latitude
      longitude
      type
      description
      pet_policy_summary
      allows_off_leash
      has_outdoor_seating_for_pets
      water_bowls_provided
      opening_hours # This is JSON, ensure MapDisplayCore can handle or format it
      average_rating # Added
      review_count   # Added
    }
  }
`;

// Match the Venue type expected by MapDisplay and what the query returns
interface Venue {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  latitude: number;
  longitude: number;
  type: string;
  description?: string | null;
  pet_policy_summary?: string | null;
  allows_off_leash?: boolean | null;
  has_outdoor_seating_for_pets?: boolean | null;
  water_bowls_provided?: boolean | null;
  opening_hours?: any | null;
  average_rating?: number | null; // Added
  review_count?: number | null;   // Added
}

const MapPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const [queryVariables, setQueryVariables] = useState({
    filterByName: '',
    filterByType: '',
  });

  // State for Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedVenueForReviews, setSelectedVenueForReviews] = useState<{id: string; name: string} | null>(null);

  const { loading, error, data, refetch: refetchVenues } = useQuery(SEARCH_VENUES_QUERY, {
    variables: queryVariables,
    notifyOnNetworkStatusChange: true,
  });

  const venuesToDisplay: Venue[] = data?.searchVenues || [];

  useEffect(() => {
    const handler = setTimeout(() => {
        setQueryVariables({
            filterByName: searchTerm,
            filterByType: filterType,
        });
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, filterType]);

  const handleOpenReviewModal = (venueId: string, venueName: string) => {
    setSelectedVenueForReviews({ id: venueId, name: venueName });
    setIsReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedVenueForReviews(null);
    // Optionally refetch venues if a review was added, to update avg_rating shown on map
    // This could be more specific if ReviewModal had an onReviewAdded callback that then calls refetchVenues
    refetchVenues();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' /* Adjust height based on your layout */ }}>
      <h2>Map Discovery</h2>
      <p>
        Find amazing pet-friendly places! (Fetching from backend)
      </p>

      <div style={{
        padding: '1rem 0',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: '250px', flexGrow: 1, maxWidth: '400px' }}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ minWidth: '200px' }}
        >
          <option value="">All Types</option>
          <option value="cafe">Cafes</option>
          <option value="park">Parks</option>
          <option value="store">Stores</option>
          <option value="restaurant">Restaurants</option>
          <option value="hotel">Hotels</option>
          {/* Add more types as defined in your backend/data */}
        </select>
        {/* A button to manually trigger search if not using useEffect-based refetching for all changes */}
        {/* <button onClick={handleSearch} disabled={loading}>Search</button> */}
      </div>

      {loading && <p>Loading venues...</p>}
      {error && <p className="error-message">Error fetching venues: {error.message}</p>}

      <div style={{ flexGrow: 1, border: '1px solid var(--current-border-color)', borderRadius: '4px', overflow: 'hidden' }}>
        {!loading && !error && (
          <MapDisplay
            initialCenter={[35.6895, 139.6917]}
            initialZoom={11}
            venues={venuesToDisplay}
            onViewReviews={handleOpenReviewModal} // Pass the handler
          />
        )}
      </div>

      {selectedVenueForReviews && (
        <ReviewModal
          venueId={selectedVenueForReviews.id}
          venueName={selectedVenueForReviews.name}
          isOpen={isReviewModalOpen}
          onClose={handleCloseReviewModal}
          // onReviewAdded={refetchVenues} // Consider adding this callback to ReviewModal for more direct refetch control
        />
      )}
    </div>
  );
};

export default MapPage;
