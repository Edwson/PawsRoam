'use client';

import React from 'react';

// Define the structure for a single review, aligning with GraphQL Review type
// This should include user information if it's resolved by the backend.
export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  visit_date?: string | null; // YYYY-MM-DD format
  created_at: string; // ISO8601 String
  user: { // Assuming user object is resolved with at least name or email
    id: string;
    name?: string | null;
    email: string; // Fallback if name is not available
  };
  // venue?: { id: string; name: string }; // Include if needed, e.g., for "My Reviews" page
}

interface ReviewListProps {
  reviews: Review[];
  // We might add props for edit/delete handlers if this list is used where those actions are possible
}

// Helper to render star ratings
const StarRating = ({ rating }: { rating: number }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} style={{ color: i <= rating ? 'var(--secondary-color)' : 'var(--current-border-color)', fontSize: '1.2rem' }}>
        ★
      </span>
    );
  }
  return <div>{stars}</div>;
};

const reviewItemStyle: React.CSSProperties = {
  backgroundColor: 'var(--current-surface)',
  padding: '1rem',
  borderRadius: '4px',
  marginBottom: '1rem',
  border: '1px solid var(--current-border-color)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

const reviewHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.5rem',
};

const reviewUserStyle: React.CSSProperties = {
  fontWeight: 'bold',
  color: 'var(--primary-dark)',
};

const reviewDateStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--text-color-muted)',
};


const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
  if (!reviews || reviews.length === 0) {
    return <p style={{textAlign: 'center', color: 'var(--text-color-muted)', padding: '1rem'}}>No reviews yet for this venue.</p>;
  }

  return (
    <div className="review-list-container" style={{marginTop: '1rem'}}>
      {/* <h4 style={{marginBottom: '1rem'}}>Reviews:</h4> */}
      {reviews.map((review) => (
        <div key={review.id} style={reviewItemStyle}>
          <div style={reviewHeaderStyle}>
            <span style={reviewUserStyle}>{review.user.name || review.user.email.split('@')[0]}</span> {/* Show name or part of email */}
            <StarRating rating={review.rating} />
          </div>
          {review.comment && <p style={{ marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{review.comment}</p>}
          <div style={reviewDateStyle}>
            Reviewed on: {new Date(review.created_at).toLocaleDateString()}
            {review.visit_date && ` | Visited on: ${new Date(review.visit_date).toLocaleDateString()}`}
          </div>
          {/* Placeholder for edit/delete buttons if this component is reused in "My Reviews" */}
          {/* <div><button>Edit</button> <button>Delete</button></div> */}
        </div>
      ))}
    </div>
  );
};

export default ReviewList;
