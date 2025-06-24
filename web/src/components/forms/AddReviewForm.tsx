// web/src/components/forms/AddReviewForm.tsx
"use client";

import React, { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useAuth } from '@/contexts/AuthContext'; // To check if user is logged in

// GraphQL mutation for adding a review
// Should match the backend mutation and include fields to update cache if necessary
const ADD_REVIEW_MUTATION = gql`
  mutation AddReview($input: CreateReviewInput!) {
    addReview(input: $input) {
      id
      rating
      comment
      visit_date
      created_at
      user {
        id
        name
      }
      # Include venue ID to help with cache updates if your backend returns it
      # venue {
      #   id
      # }
    }
  }
`;

interface AddReviewFormProps {
  venueId: string;
  onReviewAdded: () => void; // Callback to refresh data or UI
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  padding: '1rem',
  border: '1px solid var(--current-border-color)',
  borderRadius: '8px',
  backgroundColor: 'var(--current-surface)',
  marginTop: '1rem',
  marginBottom: '2rem',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 'bold',
  marginBottom: '0.25rem',
  color: 'var(--text-color)',
};

const inputStyle: React.CSSProperties = {
  padding: '0.75rem',
  border: '1px solid var(--current-border-color)',
  borderRadius: '4px',
  fontSize: '1rem',
  backgroundColor: 'var(--input-bg-color)', // Use CSS var for theming
  color: 'var(--input-text-color)', // Use CSS var
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: '100px',
  resize: 'vertical',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  backgroundColor: 'var(--primary-color)',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 'bold',
  transition: 'background-color 0.2s ease',
};

const AddReviewForm: React.FC<AddReviewFormProps> = ({ venueId, onReviewAdded }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0); // 0 means no rating selected
  const [comment, setComment] = useState<string>('');
  const [visitDate, setVisitDate] = useState<string>(''); // YYYY-MM-DD
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [addReview, { loading }] = useMutation(ADD_REVIEW_MUTATION, {
    onCompleted: () => {
      setSuccessMessage('Review submitted successfully!');
      setRating(0);
      setComment('');
      setVisitDate('');
      setError(null);
      onReviewAdded(); // Trigger callback
      setTimeout(() => setSuccessMessage(null), 3000); // Clear success message after 3s
    },
    onError: (err) => {
      setError(err.message);
      setSuccessMessage(null);
      console.error("Error adding review:", err);
    },
    // You might need to update Apollo Cache here if you want the new review to appear immediately
    // without a full refetch. This can be complex depending on your cache structure.
    // For example, using refetchQueries or update function.
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!user) {
      setError("You must be logged in to submit a review.");
      return;
    }
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }
    if (!venueId) {
      setError("Venue ID is missing.");
      return;
    }

    const input = {
      venueId,
      rating,
      comment: comment.trim() === '' ? null : comment.trim(), // Send null if comment is empty
      visit_date: visitDate === '' ? null : visitDate, // Send null if date is empty
    };

    try {
      await addReview({ variables: { input } });
    } catch (e) {
      // Error is handled by onError callback of useMutation
    }
  };

  if (!user) {
    return (
      <div style={{ ...formStyle, textAlign: 'center', padding: '2rem' }}>
        <p>Please <a href="/auth/login" style={{color: 'var(--primary-color)'}}>log in</a> to write a review.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h4 style={{ marginTop: 0, color: 'var(--primary-dark)' }}>Write a Review</h4>
      {error && <p className="error-message" style={{ color: 'var(--error-color)'}}>{error}</p>}
      {successMessage && <p className="success-message" style={{ color: 'var(--success-color)'}}>{successMessage}</p>}

      <div>
        <label htmlFor="rating" style={labelStyle}>Rating*:</label>
        <div>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              onClick={() => setRating(star)}
              style={{
                cursor: 'pointer',
                color: star <= rating ? 'var(--secondary-color)' : 'var(--current-border-color)',
                fontSize: '2rem',
                marginRight: '0.25rem',
              }}
              role="button"
              aria-label={`Rate ${star} out of 5 stars`}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setRating(star);}}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" style={labelStyle}>Comment:</label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={textareaStyle}
          placeholder="Share your experience..."
        />
      </div>

      <div>
        <label htmlFor="visitDate" style={labelStyle}>Date of Visit (Optional):</label>
        <input
          type="date"
          id="visitDate"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          style={inputStyle}
          max={new Date().toISOString().split("T")[0]} // Prevent future dates
        />
      </div>

      <button type="submit" disabled={loading} style={buttonStyle}>
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
};

export default AddReviewForm;
