'use client'; // This is a client component

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet'; // Import L for custom icons if needed later

// Fix for default icon issue with Webpack/Next.js
// (delete L.Icon.Default.prototype._getIconUrl; has been removed in recent Leaflet versions, direct path setting is better)
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
//   iconUrl: require('leaflet/dist/images/marker-icon.png').default,
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
// });
// A more modern way to handle icons if default ones are broken:
// import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// import markerIcon from 'leaflet/dist/images/marker-icon.png';
// import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// delete (L.Icon.Default.prototype as any)._getIconUrl; // Temporary fix if icons are broken

// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: markerIcon2x.src,
//   iconUrl: markerIcon.src,
//   shadowUrl: markerShadow.src,
// });


// Updated Venue interface to match data from GraphQL query
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
  opening_hours?: any | null; // JSON object
  // Add other fields from GraphQL query as needed for display
}

interface MapDisplayCoreProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  venues?: Venue[]; // Array of venues to display markers for
}

const MapDisplayCore: React.FC<MapDisplayCoreProps> = ({
  initialCenter = [35.6895, 139.6917], // Default to Tokyo
  initialZoom = 13,
  venues = [],
}) => {
  // Ensure Leaflet's CSS is loaded. This is usually done globally,
  // but can be an issue with dynamic imports if not handled carefully.
  // We've added it to globals.css, so it should be fine.

  // Default icon fix - sometimes necessary with React-Leaflet and bundlers
  // This ensures that the default Leaflet icons are found.
  // Try without first, if icons are missing, uncomment this section.
  React.useEffect(() => {
    (async () => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: (await import('leaflet/dist/images/marker-icon-2x.png')).default.src,
            iconUrl: (await import('leaflet/dist/images/marker-icon.png')).default.src,
            shadowUrl: (await import('leaflet/dist/images/marker-shadow.png')).default.src,
        });
    })();
  }, []);


  if (typeof window === 'undefined') {
    // Don't render the map on the server
    return null;
  }

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ height: '100%', width: '100%' }} // Ensure map takes up space
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {venues.map(venue => (
        <Marker key={venue.id} position={[venue.latitude, venue.longitude]}>
          <Popup minWidth={250}> {/* Set a minWidth for better layout */}
            <div style={{ fontSize: '1rem' }}> {/* Slightly larger base font for popup */}
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--primary-color)' }}>{venue.name}</h4>
              <p style={{ margin: '0.25rem 0' }}><strong>Type:</strong> {venue.type}</p>
              {venue.address && <p style={{ margin: '0.25rem 0' }}><strong>Address:</strong> {venue.address}{venue.city ? `, ${venue.city}` : ''}</p>}
              {venue.description && <p style={{ margin: '0.25rem 0' }}>{venue.description}</p>}
              {venue.pet_policy_summary && <p style={{ margin: '0.25rem 0', fontStyle: 'italic' }}>Pet Policy: {venue.pet_policy_summary}</p>}

              <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '0.5rem', fontSize: '0.9rem' }}>
                {venue.allows_off_leash && <li>✔️ Off-leash allowed</li>}
                {venue.has_outdoor_seating_for_pets && <li>✔️ Outdoor seating for pets</li>}
                {venue.water_bowls_provided && <li>✔️ Water bowls provided</li>}
              </ul>

              {/* Placeholder for opening hours - might need a helper to format nicely */}
              {/* {venue.opening_hours && <p style={{margin: '0.25rem 0', fontSize: '0.85rem'}}>Hours: {JSON.stringify(venue.opening_hours)}</p>} */}

              {/* Add a link to a future venue details page */}
              {/* <Link href={`/venues/${venue.id}`}>More details</Link> */}
            </div>
          </Popup>
        </Marker>
      ))}
      {/* Example of a single marker if no venues passed and not loading */}
      {venues.length === 0 && (
         <Marker position={initialCenter}>
            <Popup>
                PawsRoam Map Center! <br /> (No venues found for current filter)
            </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default MapDisplayCore;
