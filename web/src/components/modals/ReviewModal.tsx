'use client';

import React, { useEffect } from 'react'; // Removed useState
import { gql, useLazyQuery } from '@apollo/client';
import ReviewList, { Review } from '../reviews/ReviewList'; // Assuming Review interface is exported
// import AddReviewForm from '../forms/AddReviewForm'; // Will be created next

// Define the GraphQL query to fetch reviews for a venue
const GET_REVIEWS_FOR_VENUE_QUERY = gql`
  query GetReviewsForVenue($venueId: ID!) {
    getReviewsForVenue(venueId: $venueId) {
      id
      rating
      comment
      visit_date
      created_at
      user {
        id
        name
        email # Fallback if name is null
      }
    }
  }
`;

interface ReviewModalProps {
  venueId: string | null; // Null when modal is closed or no venue selected
  venueName: string | null;
  isOpen: boolean;
  onClose: () => void;
  // onReviewAdded: () => void; // Callback to refetch venue average rating on map page
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--current-surface)',
  padding: '2rem',
  borderRadius: '8px',
  boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
  width: '90%',
  maxWidth: '600px',
  maxHeight: '80vh',
  overflowY: 'auto',
  position: 'relative',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  cursor: 'pointer',
  color: 'var(--text-color-muted)',
};

const ReviewModal: React.FC<ReviewModalProps> = ({ venueId, venueName, isOpen, onClose }) => {
  // const [showAddReviewForm, setShowAddReviewForm] = useState(false); // For toggling form

  const [
    fetchReviews,
    { loading: reviewsLoading, error: reviewsError, data: reviewsData, /* refetch: refetchReviews */ }
  ] = useLazyQuery(GET_REVIEWS_FOR_VENUE_QUERY); // refetchReviews was unused

  useEffect(() => {
    if (isOpen && venueId) {
      // setShowAddReviewForm(false); // Reset to review list view when modal opens for a new venue
      fetchReviews({ variables: { venueId } });
    }
  }, [isOpen, venueId, fetchReviews]);

  if (!isOpen || !venueId) {
    return null;
  }

  const reviews: Review[] = reviewsData?.getReviewsForVenue || [];

  // const handleReviewSubmitted = () => {
  //   setShowAddReviewForm(false);
  //   if(refetchReviews) refetchReviews();
  //   // onReviewAdded(); // Notify parent to potentially update venue's avg rating on map
  // };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}> {/* Prevent click inside modal from closing it */}
        <button style={closeButtonStyle} onClick={onClose} aria-label="Close modal">&times;</button>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary-dark)' }}>
          Reviews for {venueName || 'Venue'}
        </h3>

        {/* Placeholder for AddReviewForm toggle and component */}
        {/* <div style={{marginBottom: '1rem'}}>
          {showAddReviewForm ? (
            <AddReviewForm venueId={venueId} onReviewSubmitted={handleReviewSubmitted} />
          ) : (
            <button
              onClick={() => setShowAddReviewForm(true)}
              className="button-style"
            >
              Write a Review
            </button>
          )}
        </div> */}
        <p style={{textAlign: 'center', padding: '1rem', border: '1px dashed var(--current-border-color)'}}>
            (Add Review Form will go here)
        </p>


        {reviewsLoading && <p>Loading reviews...</p>}
        {reviewsError && <p className="error-message">Error loading reviews: {reviewsError.message}</p>}
        {!reviewsLoading && !reviewsError && (
          <ReviewList reviews={reviews} />
        )}
      </div>
    </div>
  );
};

export default ReviewModal;
