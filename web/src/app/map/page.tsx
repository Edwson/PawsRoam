'use client'; // This page now uses client-side components and state (soon)

import React, { useState } from 'react';
import MapDisplay from '@/components/MapDisplay'; // Import the dynamically loaded map

// Placeholder for Venue data structure, will come from GraphQL later
interface Venue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string;
}

// Mock venues for initial display - this will be replaced by API data
const mockVenues: Venue[] = [
  { id: '1', name: 'Central Park Cafe', latitude: 35.6895, longitude: 139.6917, type: 'cafe' },
  { id: '2', name: 'Shibuya Dog Park', latitude: 35.6580, longitude: 139.7016, type: 'park' },
  { id: '3', name: 'Yoyogi Pet Store', latitude: 35.6700, longitude: 139.6900, type: 'store' },
  { id: '4', name: 'Another Cafe', latitude: 35.7000, longitude: 139.7500, type: 'cafe' },
];


const MapPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  // const [venues, setVenues] = useState<Venue[]>(mockVenues); // Later from API

  // In a real app, you'd fetch venues based on searchTerm and filterType
  // For now, we'll just pass all mock venues to the map.
  // Or, a simple client-side filter for demo:
  const filteredVenues = mockVenues.filter(venue => {
    const nameMatch = venue.name.toLowerCase().includes(searchTerm.toLowerCase());
    const typeMatch = filterType ? venue.type === filterType : true;
    return nameMatch && typeMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' /* Adjust height based on your layout */ }}>
      <h2>Map Discovery</h2>
      <p>
        Find amazing pet-friendly places! (Simplified Phase 1)
      </p>

      {/* Search and Filter UI Placeholders */}
      <div style={{
        padding: '1rem 0',
        display: 'flex',
        gap: '1rem', /* Increased gap */
        flexWrap: 'wrap',
        alignItems: 'center', /* Align items vertically */
        marginBottom: '1rem' /* Space below controls */
      }}>
        <input
          type="text"
          placeholder="Search by name or area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: '250px', flexGrow: 1, maxWidth: '400px' }} // Allow growth but also max width
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ minWidth: '200px' }} // Ensure select has enough width
        >
          <option value="">All Types</option>
          <option value="cafe">Pet-Friendly Cafes</option>
          <option value="park">Parks</option>
          <option value="store">Pet Stores</option>
          {/* Add more filter options as needed */}
        </select>
        {/* Add more filter controls here, e.g., for amenities */}
      </div>

      {/* Map Display Area */}
      <div style={{ flexGrow: 1, border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
        <MapDisplay
          initialCenter={[35.6895, 139.6917]} // Default to Tokyo
          initialZoom={12}
          venues={filteredVenues}
        />
      </div>
    </div>
  );
};

export default MapPage;
