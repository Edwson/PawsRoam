// web/src/app/shop-owner/venues/page.tsx
"use client";

import React from 'react'; // Removed useState, useEffect
import Link from 'next/link';
import { gql, useQuery } from '@apollo/client';
import Image from 'next/image'; // For venue image thumbnails
// ShopOwnerLayout will handle AppProviders, Layout, and auth guard

const defaultVenueImage = "/default-venue-image.png";

// GraphQL query to fetch venues owned by the current shop owner
const MY_OWNED_VENUES_QUERY = gql`
  query MyOwnedVenues {
    myOwnedVenues {
      id
      name
      type
      city
      status
      image_url # For thumbnail
      # Add other fields you want to display in the list
      # average_rating
      # review_count
    }
  }
`;

// Define the structure of a venue object for the list
interface OwnedVenue {
  id: string;
  name: string;
  type: string;
  city?: string | null;
  status?: string | null;
  image_url?: string | null;
  // average_rating?: number | null;
  // review_count?: number | null;
}

// Reusing some admin table styles for consistency, or create new ones
const venueTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '1rem',
};

const thStyle: React.CSSProperties = {
  borderBottom: '2px solid var(--primary-dark)',
  padding: '0.75rem',
  textAlign: 'left',
  backgroundColor: 'var(--current-surface-variant)',
  color: 'var(--primary-dark)',
};

const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--current-border-color)',
  padding: '0.75rem',
  textAlign: 'left',
  verticalAlign: 'middle',
};

const actionButtonStyle: React.CSSProperties = {
  marginRight: '0.5rem',
  padding: '0.3rem 0.7rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
};


const MyVenuesPageContent: React.FC = () => {
  // Feedback message state (e.g., for when a venue is added and user is redirected here)
  // const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  // useEffect(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   if (params.get('venueAdded') === 'true') {
  //     setFeedbackMessage("New venue submitted for approval!");
  //     // Optionally clear the query param from URL
  //     // window.history.replaceState({}, document.title, window.location.pathname);
  //     const timer = setTimeout(() => setFeedbackMessage(null), 4000);
  //     return () => clearTimeout(timer);
  //   }
  // }, []);


  const { data, loading, error, /* refetch */ } = useQuery<{ myOwnedVenues: OwnedVenue[] }>( // refetch was unused
    MY_OWNED_VENUES_QUERY,
    {
      // fetchPolicy: 'cache-and-network', // Useful if other actions might change this list
    }
  );

  if (loading) return <p style={{textAlign: 'center', padding: '2rem'}}>Loading your venues...</p>;
  if (error) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>Error loading your venues: {error.message}</p>;

  const venues = data?.myOwnedVenues || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{color: 'var(--primary-color)'}}>My Venues</h1>
        <Link href="/shop-owner/venues/add" passHref>
          <button className="button-style primary">Add New Venue</button>
        </Link>
      </div>

      {/* {feedbackMessage && (
        <div style={{
          padding: '1rem', marginBottom: '1rem', borderRadius: '4px',
          backgroundColor: 'var(--success-bg-color)', color: 'var(--success-color)',
          border: `1px solid var(--success-color)`
        }}>
          {feedbackMessage}
        </div>
      )} */}

      {venues.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--current-surface)', borderRadius: '8px', border: '1px dashed var(--current-border-color)'}}>
          <p>You haven&apos;t added or claimed any venues yet.</p>
          <p>Click &quot;Add New Venue&quot; to get started!</p>
        </div>
      ) : (
        <div style={{overflowX: 'auto'}}>
          <table style={venueTableStyle}>
            <thead>
              <tr>
                <th style={{...thStyle, width: '60px'}}>Image</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>City</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => (
                <tr key={venue.id}>
                  <td style={tdStyle}>
                    <Image
                      src={venue.image_url || defaultVenueImage}
                      alt={venue.name || 'Venue image'}
                      width={50}
                      height={50}
                      style={{ objectFit: 'cover', borderRadius: '4px' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = defaultVenueImage; }}
                    />
                  </td>
                  <td style={tdStyle}>{venue.name}</td>
                  <td style={tdStyle}>{venue.type}</td>
                  <td style={tdStyle}>{venue.city || 'N/A'}</td>
                  <td style={tdStyle}>
                    <span
                        className={`status-badge ${venue.status?.toLowerCase().replace('_', '-')}`}
                        style={{
                            padding: '0.25em 0.6em',
                            borderRadius: '12px',
                            fontSize: '0.8em',
                            fontWeight: 500,
                            // Basic status styling, can be enhanced with CSS classes
                            backgroundColor: venue.status === 'active' ? 'var(--success-bg-color)' : (venue.status === 'pending_approval' ? 'var(--warning-bg-color)' : 'var(--disabled-bg-color)'),
                            color: venue.status === 'active' ? 'var(--success-color)' : (venue.status === 'pending_approval' ? 'var(--warning-color)' : 'var(--disabled-text-color)'),
                        }}
                    >
                        {venue.status?.replace('_', ' ') || 'N/A'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <Link href={`/shop-owner/venues/edit/${venue.id}`} passHref> {/* Placeholder for shop owner edit page */}
                      <button className="button-style" style={{...actionButtonStyle, backgroundColor: 'var(--secondary-color)'}}>Edit</button>
                    </Link>
                    {/* Delete functionality might be added later for shop owners, with appropriate checks */}
                    {/* <button
                      onClick={() => handleDeleteVenue(venue.id, venue.name)}
                      disabled={deleteLoading}
                      className="button-style danger"
                      style={actionButtonStyle}
                    >
                      {deleteLoading ? 'Deleting...' : 'Delete'}
                    </button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


const MyVenuesPage = () => {
    // ShopOwnerLayout will provide AppProviders and the main Layout wrapper
    return <MyVenuesPageContent />;
}

export default MyVenuesPage;
