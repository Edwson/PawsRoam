'use client';

import React, { useState, useEffect } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useRouter, useParams } from 'next/navigation';
import PetForm, { PetFormData } from '@/components/forms/PetForm';
import Link from 'next/link';
import adminStyles from '@/app/admin/AdminLayout.module.css'; // Re-use for page title styling
import { useAuth } from '@/contexts/AuthContext';

// GraphQL query to fetch a single pet by ID
const GET_PET_BY_ID_QUERY = gql`
  query GetPetById($id: ID!) {
    getPetById(id: $id) {
      id
      name
      species
      breed
      birthdate
      avatar_url
      notes
      user_id # For an auth check, though resolver should handle it
    }
  }
`;

// GraphQL mutation for updating a pet
const UPDATE_PET_MUTATION = gql`
  mutation UpdatePet($id: ID!, $input: UpdatePetInput!) {
    updatePet(id: $id, input: $input) {
      id
      name # Add other fields if needed for cache or immediate feedback
    }
  }
`;

const EditPetPage = () => {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser, loading: authLoading } = useAuth(); // Get current user for auth check
  const petId = params.petId as string;

  const [formError, setFormError] = useState<string | null>(null);
  const [initialPetData, setInitialPetData] = useState<Partial<PetFormData> | null>(null);

  // Fetch the pet's data
  const { data: petData, loading: queryLoading, error: queryError } = useQuery(GET_PET_BY_ID_QUERY, {
    variables: { id: petId },
    skip: !petId || !currentUser, // Skip if no petId or user not loaded
    onCompleted: (data) => {
      if (data?.getPetById) {
        if (data.getPetById.user_id !== currentUser?.id) {
          setFormError("You are not authorized to edit this pet.");
          // Optionally redirect: router.push('/profile/pets');
          return;
        }
        // Ensure birthdate is in YYYY-MM-DD format if it exists
        const fetchedPet = data.getPetById;
        setInitialPetData({
          ...fetchedPet,
          birthdate: fetchedPet.birthdate ? fetchedPet.birthdate.split('T')[0] : '', // Assuming ISO string from GQL
        });
      } else {
        setFormError("Pet not found.");
      }
    },
     onError: (err) => {
        setFormError(`Error fetching pet: ${err.message}`);
     }
  });

  // Mutation for updating the pet
  const [updatePet, { loading: mutationLoading, error: mutationError }] = useMutation(UPDATE_PET_MUTATION, {
    onCompleted: () => {
      router.push('/profile/pets?petUpdated=true'); // Redirect on success
    },
    onError: (err) => {
      setFormError(`Error updating pet: ${err.message}`);
    },
    refetchQueries: ['MyPets'], // Refetch MyPets list after update
  });

  const handleSubmitPet = async (formData: PetFormData) => {
    setFormError(null);
    if (!petId) return;

    const inputForMutation: Partial<PetFormData> = {};
    // Only include fields that have changed or are part of the UpdatePetInput
    // For simplicity, sending all fields, GQL resolver will pick what it needs.
    // A more optimized approach would be to send only changed fields.

    // Ensure birthdate is null if empty for the mutation
    const finalFormData = {
        ...formData,
        birthdate: formData.birthdate === '' ? null : formData.birthdate,
        breed: formData.breed === '' ? null : formData.breed,
        avatar_url: formData.avatar_url === '' ? null : formData.avatar_url,
        notes: formData.notes === '' ? null : formData.notes,
    };
    // Remove fields not in UpdatePetInput or if they are unchanged from initial (more complex)
    // For now, sending all fields from form (name, species, breed, birthdate, avatar_url, notes)
    const { name, species, breed, birthdate, avatar_url, notes } = finalFormData;
    await updatePet({ variables: { id: petId, input: { name, species, breed, birthdate, avatar_url, notes } } });
  };

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/auth/login?message=Please login to edit pets.');
    }
  }, [authLoading, currentUser, router]);

  if (authLoading || queryLoading) return <p>Loading pet details...</p>;
  if (queryError && !initialPetData) return <p className="error-message">Error loading pet: {queryError.message}</p>;
  if (!initialPetData && !queryLoading) return <p className="error-message">Pet not found or unable to load data.</p>;
  if (formError && initialPetData && initialPetData.user_id !== currentUser?.id) { // Specific auth error
    return <p className="error-message">{formError}</p>;
  }


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className={adminStyles.adminPageTitle}>Edit Pet: {initialPetData?.name || 'Loading...'}</h2>
        <Link href="/profile/pets" className="button-style" style={{backgroundColor: 'var(--text-color-muted)'}}>
          Back to My Pets
        </Link>
      </div>

      {formError && <p className="error-message">{formError}</p>}
      {mutationError && !formError && <p className="error-message">Update error: {mutationError.message}</p>}

      {initialPetData && (
        <div className={adminStyles.adminSection} style={{marginTop: '1.5rem'}}>
          <PetForm
            initialData={initialPetData}
            onSubmitFunction={handleSubmitPet}
            submitButtonText="Save Changes"
            isLoading={mutationLoading}
          >
            {/* Placeholder for AI name suggester - less relevant for edit, but structure allows it */}
          </PetForm>
        </div>
      )}
    </div>
  );
};

export default EditPetPage;
