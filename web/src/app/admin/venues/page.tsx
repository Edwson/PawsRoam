// web/src/app/admin/venues/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { gql, useQuery, useMutation } from '@apollo/client';
import { AdminRouteGuard } from '@/app/admin/AdminRouteGuard'; // Import AdminRouteGuard
import Layout from '@/components/Layout'; // Standard layout
import AppProviders from '@/components/AppProviders'; // For Apollo Client
import Image from 'next/image'; // Import Image for thumbnails

const defaultVenueImage = "/default-venue-image.png"; // Define default image

// GraphQL query to fetch venues (can use existing searchVenues or a dedicated admin one)
const GET_VENUES_QUERY = gql`
  query AdminSearchVenues($filterByName: String, $filterByType: String) {
    searchVenues(filterByName: $filterByName, filterByType: $filterByType) { # Using existing searchVenues
      id
      name
      type
      city
      status
      average_rating
      review_count
      image_url # Fetch image_url
    }
  }
`;

// GraphQL mutation for deleting a venue
const ADMIN_DELETE_VENUE_MUTATION = gql`
  mutation AdminDeleteVenue($id: ID!) {
    adminDeleteVenue(id: $id)
  }
`;

interface VenueForList {
  id: string;
  name: string;
  type: string;
  city?: string | null;
  status?: string | null;
  average_rating?: number | null;
  review_count?: number | null;
  image_url?: string | null; // Add to interface
}

const venueTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '1rem',
};

const thStyle: React.CSSProperties = {
  borderBottom: '2px solid var(--primary-dark)',
  padding: '0.75rem',
  textAlign: 'left',
  backgroundColor: 'var(--current-surface-variant)', // Slightly different bg for header
  color: 'var(--primary-dark)',
};

const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--current-border-color)',
  padding: '0.75rem',
  textAlign: 'left',
};

const actionButtonStyle: React.CSSProperties = {
  marginRight: '0.5rem',
  padding: '0.3rem 0.7rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const AdminVenuesPageContent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);


  const { data, loading, error, refetch } = useQuery<{ searchVenues: VenueForList[] }>(GET_VENUES_QUERY, {
    variables: { filterByName: searchTerm, filterByType: filterType },
    notifyOnNetworkStatusChange: true,
  });

  const [adminDeleteVenue, { loading: deleteLoading }] = useMutation(ADMIN_DELETE_VENUE_MUTATION, {
    onCompleted: () => {
      setFeedbackMessage({type: 'success', message: 'Venue deleted successfully!'});
      refetch(); // Refetch the list of venues
    },
    onError: (err) => {
      setFeedbackMessage({type: 'error', message: `Error deleting venue: ${err.message}`});
      console.error("Error deleting venue:", err);
    },
  });

  useEffect(() => {
    // Debounce refetching
    const handler = setTimeout(() => {
      refetch({ filterByName: searchTerm, filterByType: filterType });
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, filterType, refetch]);

  useEffect(() => {
    if(feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);


  const handleDeleteVenue = (venueId: string, venueName: string) => {
    if (window.confirm(`Are you sure you want to delete venue "${venueName}" (ID: ${venueId})? This action cannot be undone.`)) {
      adminDeleteVenue({ variables: { id: venueId } });
    }
  };

  if (loading && !data) return <p>Loading venues...</p>; // Show loading only on initial load without data
  if (error) return <p className="error-message">Error loading venues: {error.message}</p>;

  const venues = data?.searchVenues || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Manage Venues</h2>
        <Link href="/admin/venues/add" passHref>
          <button className="button-style primary">Add New Venue</button>
        </Link>
      </div>

      {feedbackMessage && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '4px',
          backgroundColor: feedbackMessage.type === 'success' ? 'var(--success-bg-color)' : 'var(--error-bg-color)',
          color: feedbackMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)',
          border: `1px solid ${feedbackMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`
        }}>
          {feedbackMessage.message}
        </div>
      )}

      {/* Filter inputs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
          {/* Populate with actual venue types */}
        </select>
      </div>
       {loading && <p>Filtering venues...</p>}


      {venues.length === 0 && !loading ? (
        <p>No venues found matching your criteria.</p>
      ) : (
        <table style={venueTableStyle}>
          <thead>
            <tr>
              <th style={{...thStyle, width: '50px'}}>Image</th>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>City</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Rating (Reviews)</th>
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
                    width={40}
                    height={40}
                    style={{ objectFit: 'cover', borderRadius: '4px' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = defaultVenueImage; }}
                  />
                </td>
                <td style={tdStyle}><small>{venue.id}</small></td>
                <td style={tdStyle}>{venue.name}</td>
                <td style={tdStyle}>{venue.type}</td>
                <td style={tdStyle}>{venue.city || 'N/A'}</td>
                <td style={tdStyle}>{venue.status || 'N/A'}</td>
                <td style={tdStyle}>
                  {typeof venue.average_rating === 'number' ? venue.average_rating.toFixed(1) : 'N/A'}
                  ({venue.review_count || 0})
                </td>
                <td style={tdStyle}>
                  <Link href={`/admin/venues/edit/${venue.id}`} passHref>
                    <button className="button-style" style={{...actionButtonStyle, backgroundColor: 'var(--secondary-color)'}}>Edit</button>
                  </Link>
                  <button
                    onClick={() => handleDeleteVenue(venue.id, venue.name)}
                    disabled={deleteLoading}
                    className="button-style danger"
                    style={actionButtonStyle}
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Wrap with AppProviders and AdminRouteGuard
const AdminVenuesPage = () => {
  return (
    <AppProviders> {/* Ensures Apollo Client is available */}
      <AdminRouteGuard>
        <Layout>
          <AdminVenuesPageContent />
        </Layout>
      </AdminRouteGuard>
    </AppProviders>
  );
};

export default AdminVenuesPage;
