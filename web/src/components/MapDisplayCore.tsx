'use client'; // This is a client component

import React, { useEffect } from 'react'; // Added useEffect, Removed useRef
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'; // Added useMap
import L /* , { LatLngExpression } */ from 'leaflet'; // Import L, Removed LatLngExpression
import Link from 'next/link'; // Import Link for navigation
import Image from 'next/image'; // Import Image for thumbnails

// const defaultVenueImage = "/default-venue-image.png"; // Unused variable

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
  opening_hours?: any | null;
  average_rating?: number | null;
  review_count?: number | null;
  image_url?: string | null; // Added image_url
}

interface MapDisplayCoreProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  venues?: Venue[];
  onViewReviews: (venueId: string, venueName: string) => void;
  userLocation?: { lat: number; lng: number } | null; // Added userLocation
}

// Component to handle map re-centering when userLocation changes
const UserLocationUpdater: React.FC<{ userLocation: { lat: number; lng: number } | null }> = ({ userLocation }) => {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 14); // Zoom level 14 when centering on user
    }
  }, [userLocation, map]);
  return null; // This component does not render anything itself
};

const MapDisplayCore: React.FC<MapDisplayCoreProps> = ({
  initialCenter = [35.6895, 139.6917], // Default to Tokyo
  initialZoom = 13,
  venues = [],
  onViewReviews,
  userLocation, // Destructure the new prop
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
      center={userLocation ? [userLocation.lat, userLocation.lng] : initialCenter}
      zoom={userLocation ? 14 : initialZoom} // Higher zoom if user location is set
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <UserLocationUpdater userLocation={userLocation} />
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} /* icon={userLocationIcon} // Optional: custom icon */ >
          <Popup>You are here!</Popup>
        </Marker>
      )}
      {venues.map(venue => (
        <Marker key={venue.id} position={[venue.latitude, venue.longitude]}>
          <Popup minWidth={250}> {/* Set a minWidth for better layout */}
            <div style={{ fontSize: '1rem' }}> {/* Slightly larger base font for popup */}
              {venue.image_url && (
                <div style={{ marginBottom: '0.5rem', borderRadius: '4px', overflow: 'hidden' }}>
                  <Image
                    src={venue.image_url}
                    alt={`Image of ${venue.name}`}
                    width={230} // Popup width is min 250, so slightly less for padding
                    height={130} // Maintain an aspect ratio (e.g., ~16:9)
                    style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} // Hide on error
                  />
                </div>
              )}
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--primary-color)' }}>{venue.name}</h4>
              <p style={{ margin: '0.25rem 0' }}><strong>Type:</strong> {venue.type}</p>
              {venue.address && <p style={{ margin: '0.25rem 0' }}><strong>Address:</strong> {venue.address}{venue.city ? `, ${venue.city}` : ''}</p>}
              {/* Limit description length in popup */}
              {venue.description && <p style={{ margin: '0.25rem 0', fontSize: '0.9em', maxHeight: '60px', overflowY: 'auto' }}>{venue.description.substring(0,100)}{venue.description.length > 100 ? '...' : ''}</p>}
              {venue.pet_policy_summary && <p style={{ margin: '0.25rem 0', fontStyle: 'italic' }}>Pet Policy: {venue.pet_policy_summary}</p>}

              <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '0.5rem', fontSize: '0.9rem' }}>
                {venue.allows_off_leash && <li>✔️ Off-leash allowed</li>}
                {venue.has_outdoor_seating_for_pets && <li>✔️ Outdoor seating for pets</li>}
                {venue.water_bowls_provided && <li>✔️ Water bowls provided</li>}
              </ul>

              {/* Display Average Rating and Review Count */}
              <div style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
                {typeof venue.average_rating === 'number' && venue.average_rating > 0 ? (
                  <span>⭐ {venue.average_rating.toFixed(1)} ({venue.review_count} review{venue.review_count !== 1 ? 's' : ''})</span>
                ) : (
                  <span>No reviews yet</span>
                )}
              </div>

              {/* Placeholder for opening hours - might need a helper to format nicely */}
              {/* {venue.opening_hours && <p style={{margin: '0.25rem 0', fontSize: '0.85rem'}}>Hours: {JSON.stringify(venue.opening_hours)}</p>} */}

              <button
                onClick={() => onViewReviews(venue.id, venue.name)}
                className="button-style"
                style={{fontSize: '0.9rem', padding: '0.3rem 0.6rem', marginTop: '0.5rem', backgroundColor: 'var(--accent-color)'}}
              >
                View/Add Reviews
              </button>

              <Link href={`/venues/${venue.id}`} passHref>
                <a className="button-style" style={{
                  fontSize: '0.9rem',
                  padding: '0.3rem 0.6rem',
                  marginTop: '0.5rem',
                  marginLeft: '0.5rem', // Add some space between buttons
                  textDecoration: 'none',
                  display: 'inline-block', // Ensure it behaves like a button
                  backgroundColor: 'var(--secondary-color)', // Different color for distinction
                  color: 'white'
                }}>
                  View Details
                </a>
              </Link>
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
