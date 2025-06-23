'use client';

import React, { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import MapDisplay from '@/components/MapDisplay'; // Import the dynamically loaded map

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
}

const MapPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  // Variables for the GraphQL query
  const [queryVariables, setQueryVariables] = useState({
    filterByName: '',
    filterByType: '',
  });

  const { loading, error, data, refetch } = useQuery(SEARCH_VENUES_QUERY, {
    variables: queryVariables,
    notifyOnNetworkStatusChange: true, // Useful if you want to show loading states on refetch
  });

  const venuesToDisplay: Venue[] = data?.searchVenues || [];

  // Handle search term submission (e.g., on button click or debounce)
  const handleSearch = () => {
    setQueryVariables({
      filterByName: searchTerm,
      filterByType: filterType,
    });
    // refetch(); // useQuery typically refetches when variables change, but explicit refetch can be used.
  };

  // useEffect to refetch when searchTerm or filterType changes (debounced approach would be better for searchTerm)
  useEffect(() => {
    // A simple way to trigger refetch when filters change.
    // For searchTerm, debounce would be better to avoid too many API calls.
    const handler = setTimeout(() => {
        setQueryVariables({
            filterByName: searchTerm,
            filterByType: filterType,
        });
    }, 500); // Debounce search term by 500ms

    return () => {
        clearTimeout(handler);
    };
  }, [searchTerm, filterType]);

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
            initialCenter={[35.6895, 139.6917]} // Default to Tokyo, or derive from user's location later
            initialZoom={11} // Adjust zoom level
            venues={venuesToDisplay}
          />
        )}
      </div>
    </div>
  );
};

export default MapPage;
