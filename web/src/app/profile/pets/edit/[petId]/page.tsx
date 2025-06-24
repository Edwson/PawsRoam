'use client';

import React, { useState, useEffect } from 'react';
import { gql, useQuery, useMutation, ApolloCache } from '@apollo/client';
import { useRouter, useParams } from 'next/navigation';
import PetForm, { PetFormData } from '@/components/forms/PetForm';
import Link from 'next/link';
import adminStyles from '@/app/admin/AdminLayout.module.css'; // Re-use for page title styling
import PetAvatarUpload from '@/components/pets/PetAvatarUpload'; // Import the component
import Image from 'next/image'; // For displaying current avatar
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
  // Store the full pet data, including avatar_url, not just PetFormData
  const [currentPet, setCurrentPet] = useState<any | null>(null); // Using 'any' for now, refine with Pet type

  // Fetch the pet's data
  const { data: petData, loading: queryLoading, error: queryError, client } = useQuery(GET_PET_BY_ID_QUERY, {
    variables: { id: petId },
    skip: !petId || !currentUser, // Skip if no petId or user not loaded
    onCompleted: (data) => {
      if (data?.getPetById) {
        if (data.getPetById.user_id !== currentUser?.id) {
          setFormError("You are not authorized to edit this pet.");
          setCurrentPet(null); // Clear pet data if not authorized
          return;
        }
        const fetchedPet = data.getPetById;
        setCurrentPet({
          ...fetchedPet,
          birthdate: fetchedPet.birthdate ? fetchedPet.birthdate.split('T')[0] : '',
        });
      } else {
        setFormError("Pet not found.");
        setCurrentPet(null);
      }
    },
    onError: (err) => {
      setFormError(`Error fetching pet: ${err.message}`);
      setCurrentPet(null);
    }
  });

  // Mutation for updating the pet (details, not avatar)
  const [updatePet, { loading: mutationLoading, error: mutationError }] = useMutation(UPDATE_PET_MUTATION, {
    onCompleted: () => {
      router.push('/profile/pets?petUpdated=true'); // Redirect on success
    },
    onError: (err) => {
      setFormError(`Error updating pet details: ${err.message}`);
    },
    // We can update cache manually or refetch. Refetch 'MyPets' is good for list page.
    // For current page, manual update is better if not redirecting immediately or if avatar changes.
    refetchQueries: ['MyPets', { query: GET_PET_BY_ID_QUERY, variables: { id: petId } } ],
  });

  const handleAvatarUploadSuccess = (newAvatarUrl: string) => {
    if (currentPet) {
      const updatedPetData = { ...currentPet, avatar_url: newAvatarUrl };
      setCurrentPet(updatedPetData); // Update local state for immediate preview

      // Update Apollo Cache for GET_PET_BY_ID_QUERY
      client.writeQuery({
        query: GET_PET_BY_ID_QUERY,
        variables: { id: petId },
        data: {
          getPetById: updatedPetData,
        },
      });
      // Also update the MyPets query cache if avatar is shown there
      // This is more complex as it involves modifying a list.
      // For now, we rely on refetchQueries for MyPets list or a full refetch if needed.
       const cache = client.cache as ApolloCache<any>;
       const myPetsQuery = gql`query MyPets { myPets { id name species breed birthdate avatar_url notes created_at updated_at } }`; // Define MyPets query structure
        try {
            const dataInCache = cache.readQuery<{ myPets: any[] }>({ query: myPetsQuery });
            if (dataInCache && dataInCache.myPets) {
                const updatedMyPets = dataInCache.myPets.map(pet =>
                    pet.id === petId ? { ...pet, avatar_url: newAvatarUrl } : pet
                );
                cache.writeQuery({ query: myPetsQuery, data: { myPets: updatedMyPets } });
            }
        } catch (e) {
            console.warn("MyPets query not in cache or error updating:", e);
            // If MyPets is not in cache, refetchQueries will handle it, or a manual refetch can be triggered.
        }
    }
  };

  const handleSubmitPetDetails = async (formData: PetFormData) => {
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

  if (authLoading || (queryLoading && !currentPet)) return <p style={{textAlign: 'center', padding: '2rem'}}>Loading pet details...</p>;

  // If there was a query error and we still don't have pet data (e.g. initial load error)
  if (queryError && !currentPet && !queryLoading) return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>Error loading pet: {queryError.message}</p>;

  // If pet data loading finished, but pet is null (e.g., not found, or auth error from onCompleted)
  if (!currentPet && !queryLoading) {
    return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>{formError || "Pet not found or you're not authorized."}</p>;
  }

  // If formError is set due to authorization specifically after data was initially fetched (edge case, usually onCompleted handles this)
  if (formError && currentPet && currentPet.user_id !== currentUser?.id) {
     return <p className="error-message" style={{textAlign: 'center', padding: '2rem'}}>{formError}</p>;
  }

  // Fallback if currentPet is somehow still null here, though above checks should cover.
  if (!currentPet) return <p style={{textAlign: 'center', padding: '2rem'}}>Pet data is unavailable.</p>;


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className={adminStyles.adminPageTitle}>Edit Pet: {currentPet?.name || 'Loading...'}</h2>
        <Link href="/profile/pets" className="button-style" style={{backgroundColor: 'var(--text-color-muted)'}}>
          Back to My Pets
        </Link>
      </div>

      {formError && (!currentPet || currentPet.user_id === currentUser?.id) && <p className="error-message">{formError}</p>}
      {mutationError && !formError && <p className="error-message">Update error: {mutationError.message}</p>}

      <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
           {currentPet && (
            <PetAvatarUpload
                petId={petId}
                currentAvatarUrl={currentPet.avatar_url}
                onUploadSuccess={handleAvatarUploadSuccess}
            />
           )}
        </div>
        <div className={adminStyles.adminSection} style={{marginTop: 0, flex: '2 1 400px', minWidth: '300px'}}>
          <h3 style={{marginTop: 0}}>Pet Details</h3>
          {currentPet && (
            <PetForm
                initialData={{ // Pass only PetFormData fields to PetForm
                    name: currentPet.name,
                    species: currentPet.species,
                    breed: currentPet.breed,
                    birthdate: currentPet.birthdate,
                    avatar_url: currentPet.avatar_url, // PetForm might use this if not managed separately
                    notes: currentPet.notes,
                }}
                onSubmitFunction={handleSubmitPetDetails}
                submitButtonText="Save Changes"
                isLoading={mutationLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPetPage;
