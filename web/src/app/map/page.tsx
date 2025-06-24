'use client';

import React, { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import MapDisplay from '@/components/MapDisplay';
import ReviewModal from '@/components/modals/ReviewModal'; // Import ReviewModal

// Define the GraphQL query for searching venues
const SEARCH_VENUES_QUERY = gql`
  query SearchVenues(
    $filterByName: String,
    $filterByType: String,
    $latitude: Float,
    $longitude: Float,
    $radiusKm: Float
  ) {
    searchVenues(
      filterByName: $filterByName,
      filterByType: $filterByType,
      latitude: $latitude,
      longitude: $longitude,
      radiusKm: $radiusKm
    ) {
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
      image_url # Fetch venue image URL
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
  average_rating?: number | null;
  review_count?: number | null;
  image_url?: string | null; // Added image_url
}

const MapPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(10); // Default 10km


  const [queryVariables, setQueryVariables] = useState<any>({
    filterByName: '',
    filterByType: '',
    latitude: null,
    longitude: null,
    radiusKm: searchRadiusKm,
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
      setQueryVariables(prev => ({
        ...prev,
        filterByName: searchTerm,
        filterByType: filterType,
        // radiusKm is updated by its own effect or when userLocation changes
      }));
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, filterType]);

  // Effect to update queryVariables when userLocation or searchRadiusKm changes
  useEffect(() => {
    if (userLocation) {
      setQueryVariables(prev => ({
        ...prev,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        radiusKm: searchRadiusKm, // Use the state for radius
      }));
    } else {
      // If no user location, clear geo-filters but keep name/type
      setQueryVariables(prev => ({
        ...prev,
        latitude: null,
        longitude: null,
        radiusKm: null, // Or keep searchRadiusKm if we want non-geo searches to respect a radius (doesn't make sense)
      }));
    }
  }, [userLocation, searchRadiusKm]);

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

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      setLocationError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting user location:", error);
          setLocationError(`Error: ${error.message}. Please ensure location services are enabled.`);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }
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
        <button onClick={handleUseMyLocation} disabled={isLocating} className="button-style secondary">
          {isLocating ? 'Locating...' : '📍 Use My Location'}
        </button>
        {userLocation && ( // Only show radius control if location is active
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <label htmlFor="radiusSelect" style={{fontSize: '0.9rem', color: 'var(--text-color-muted)'}}>Radius:</label>
                <select
                    id="radiusSelect"
                    value={searchRadiusKm}
                    onChange={(e) => setSearchRadiusKm(parseFloat(e.target.value))}
                    style={{ padding: '0.4rem', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid var(--current-border-color)' }}
                >
                    <option value="1">1 km</option>
                    <option value="2">2 km</option>
                    <option value="5">5 km</option>
                    <option value="10">10 km</option>
                    <option value="25">25 km</option>
                    <option value="50">50 km</option>
                </select>
            </div>
        )}
      </div>

      {locationError && <p className="error-message" style={{marginBottom: '1rem'}}>{locationError}</p>}
      {loading && <p>Loading venues...</p>}
      {error && <p className="error-message">Error fetching venues: {error.message}</p>}

      <div style={{ flexGrow: 1, border: '1px solid var(--current-border-color)', borderRadius: '4px', overflow: 'hidden' }}>
        {!loading && !error && (
          <MapDisplay
            initialCenter={[35.6895, 139.6917]} // Default if no userLocation yet
            initialZoom={11}
            venues={venuesToDisplay}
            onViewReviews={handleOpenReviewModal}
            userLocation={userLocation} // Pass userLocation
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
