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


// Venue type placeholder - will eventually come from GraphQL
interface Venue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string; // e.g., 'cafe', 'park'
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
          <Popup>
            <strong>{venue.name}</strong><br />
            Type: {venue.type || 'N/A'}
            {/* Add more venue details here */}
          </Popup>
        </Marker>
      ))}
      {/* Example of a single marker if no venues passed */}
      {venues.length === 0 && (
         <Marker position={initialCenter}>
            <Popup>
                PawsRoam Map Center! <br /> (Default: Tokyo)
            </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default MapDisplayCore;
