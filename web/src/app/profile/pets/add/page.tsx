'use client';

import React, { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import PetForm, { PetFormData } from '@/components/forms/PetForm';
import Link from 'next/link';
import adminStyles from '@/app/admin/AdminLayout.module.css'; // Re-use for page title styling

// Define the GraphQL mutation for creating a pet
const CREATE_PET_MUTATION = gql`
  mutation CreatePet($input: CreatePetInput!) {
    createPet(input: $input) {
      id
      name
      species
      # Include other fields if you want them back immediately, e.g., for cache updates
    }
  }
`;

const AddPetPage = () => {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const [createPet, { loading, error: mutationError }] = useMutation(CREATE_PET_MUTATION, {
    onCompleted: (data) => {
      // console.log('Pet created:', data.createPet);
      // Optionally, show a success message before redirecting
      // For now, directly redirect to the pets list
      router.push('/profile/pets?newPet=true'); // Add a query param to show a success message on the list page
    },
    onError: (err) => {
      setFormError(err.message);
    },
    // Refetch queries or update cache can be done here too
    refetchQueries: ['MyPets'], // Refetch the MyPets query after creation
    // Or, update cache manually for more optimistic UI
  });

  const handleSubmitPet = async (formData: PetFormData) => {
    setFormError(null); // Clear previous errors
    // console.log('Submitting pet data:', formData);

    // Ensure birthdate is null if empty, or formatted correctly.
    // The PetForm already handles empty string for birthdate, which GQL string scalar for date can handle or resolver can parse.
    // If your GQL scalar for Date is strict, you might need to transform '' to null.
    const inputForMutation = {
        ...formData,
        birthdate: formData.birthdate === '' ? null : formData.birthdate,
        breed: formData.breed === '' ? null : formData.breed,
        avatar_url: formData.avatar_url === '' ? null : formData.avatar_url,
        notes: formData.notes === '' ? null : formData.notes,
    };


    await createPet({ variables: { input: inputForMutation } });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h2 className={adminStyles.adminPageTitle}>Add New Pet</h2>
         <Link href="/profile/pets" className="button-style" style={{backgroundColor: 'var(--text-color-muted)'}}>
            Cancel
         </Link>
      </div>

      {formError && <p className="error-message">Error adding pet: {formError}</p>}
      {mutationError && !formError && <p className="error-message">Submission error: {mutationError.message}</p>}


      <div className={adminStyles.adminSection} style={{marginTop: '1.5rem'}}> {/* Re-use adminSection for card style */}
        <PetForm
            onSubmitFunction={handleSubmitPet}
            submitButtonText="Add Pet"
            isLoading={loading}
        >
            {/* Children for PetForm, e.g., AI name suggester, can be placed here later */}
            {/* Example: <button type="button" data-field-name="name">Suggest Name</button> */}
        </PetForm>
      </div>
    </div>
  );
};

export default AddPetPage;
