'use client';

import React, { useState } from 'react'; // Added useState
import { gql, useQuery, useMutation } from '@apollo/client'; // Added useMutation
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import adminStyles from '@/app/admin/AdminLayout.module.css';

// Define the GraphQL query for fetching pets
const MY_PETS_QUERY = gql`
  query MyPets {
    myPets {
      id
      name
      species
      breed
      birthdate
      avatar_url
      # notes # Decide if notes should be shown in the list view
    }
  }
`;

const DELETE_PET_MUTATION = gql`
  mutation DeletePet($id: ID!) {
    deletePet(id: $id)
  }
`;

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  birthdate?: string | null;
  avatar_url?: string | null;
}

// Basic styles for pet cards or list items
const petCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--current-surface)',
  padding: '1.5rem',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  marginBottom: '1rem',
  border: '1px solid var(--current-border-color)',
};

const MyPetsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null); // For success/error messages

  const { loading: petsLoading, error: petsError, data: petsData, refetch: refetchPets } = useQuery(MY_PETS_QUERY, {
    skip: !authLoading && !user, // Skip query if auth is loading or user not logged in
  });

  const [deletePetMutation, { loading: deleteLoading }] = useMutation(DELETE_PET_MUTATION, {
    onCompleted: () => {
      setFeedbackMessage('Pet deleted successfully!');
      refetchPets(); // Refetch the list of pets
      setTimeout(() => setFeedbackMessage(null), 3000);
    },
    onError: (err) => {
      setFeedbackMessage(`Error deleting pet: ${err.message}`);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  });

  const handleDeletePet = (petId: string, petName: string) => {
    if (window.confirm(`Are you sure you want to delete ${petName}? This action cannot be undone.`)) {
      deletePetMutation({ variables: { id: petId } });
    }
  };

  // Handle auth loading and redirection if not logged in
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?message=Please login to view your pets.');
    }
  }, [user, authLoading, router]);

  if (authLoading || petsLoading) {
    return <p>Loading your pets...</p>;
  }

  if (!user) {
    return <p>Please login to see your pets.</p>; // Fallback, should be redirected
  }

  if (petsError) {
    return <p className="error-message">Error loading your pets: {petsError.message}</p>;
  }

  const pets: Pet[] = petsData?.myPets || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className={adminStyles.adminPageTitle}>My Pets</h2>
        <Link href="/profile/pets/add" className="button-style">
          Add New Pet
        </Link>
      </div>

      {feedbackMessage && (
        <p className={feedbackMessage.startsWith('Error') ? "error-message" : "success-message"} /* You might need a .success-message class */
           style={feedbackMessage.startsWith('Error') ? {} : { backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', border: '1px solid var(--primary-dark)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}
        >
          {feedbackMessage}
        </p>
      )}

      {pets.length === 0 ? (
        <div className={adminStyles.adminSection} style={{ textAlign: 'center' }}>
          <p>You haven&apos;t added any pets yet.</p>
          <p>Why not add your furry, scaly, or feathery friend?</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {pets.map((pet) => (
            <div key={pet.id} style={petCardStyle}>
              <h3 style={{ marginTop: 0, color: 'var(--primary-color)' }}>{pet.name}</h3>
              <p><strong>Species:</strong> {pet.species}</p>
              {pet.breed && <p><strong>Breed:</strong> {pet.breed}</p>}
              {pet.birthdate && <p><strong>Birthdate:</strong> {new Date(pet.birthdate).toLocaleDateString()}</p>}

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <Link href={`/profile/pets/edit/${pet.id}`} className="button-style" style={{fontSize: '0.9rem', padding: '0.4rem 0.8rem'}}>
                  Edit
                </Link>
                <button
                  onClick={() => handleDeletePet(pet.id, pet.name)}
                  disabled={deleteLoading}
                  className="button-style"
                  style={{backgroundColor: '#D32F2F', fontSize: '0.9rem', padding: '0.4rem 0.8rem'}} // More specific error red
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPetsPage;
