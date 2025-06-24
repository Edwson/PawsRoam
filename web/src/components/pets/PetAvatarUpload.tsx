// web/src/components/pets/PetAvatarUpload.tsx
"use client";

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';
import Image from 'next/image';

// GraphQL Mutation for updating pet avatar
const UPDATE_PET_AVATAR_MUTATION = gql`
  mutation UpdatePetAvatar($petId: ID!, $imageUrl: String!) {
    updatePetAvatar(petId: $petId, imageUrl: $imageUrl) {
      id
      avatar_url # Ensure this is returned to update UI
      # Potentially other pet fields if needed
    }
  }
`;

interface PetAvatarUploadProps {
  petId: string;
  currentAvatarUrl?: string | null;
  onUploadSuccess: (newAvatarUrl: string) => void; // Callback to update parent state
}

const defaultPetAvatar = "/default-pet-avatar.png"; // Path to a default pet avatar in /public

const PetAvatarUpload: React.FC<PetAvatarUploadProps> = ({ petId, currentAvatarUrl, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [updatePetAvatar, { loading }] = useMutation(UPDATE_PET_AVATAR_MUTATION, {
    onCompleted: (data) => {
      const newUrl = data.updatePetAvatar?.avatar_url;
      if (newUrl) {
        setSuccessMessage('Pet avatar updated successfully!');
        setError(null);
        onUploadSuccess(newUrl);
        setSelectedFile(null);
      } else {
        setError("Failed to get updated avatar URL from server.");
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      setError(`Error updating pet avatar: ${err.message}`);
      setSuccessMessage(null);
      console.error("Error updating pet avatar:", err);
      setTimeout(() => setError(null), 5000);
    }
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Max 2MB
        setError("File is too large. Maximum size is 2MB.");
        setSelectedFile(null);
        setPreviewUrl(currentAvatarUrl || null);
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError("Invalid file type. Please select an image (PNG, JPG, GIF).");
        setSelectedFile(null);
        setPreviewUrl(currentAvatarUrl || null);
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setSuccessMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an image file first.");
      return;
    }
    setError(null);
    setSuccessMessage(null);

    // Simulation of Upload (same as user avatar for now)
    const placeholderUrls = [
      'https://i.pravatar.cc/150?img=5',
      'https://picsum.photos/seed/petavatar1/150',
      '/placeholder-avatars/avatar1.png', // Reusing user placeholders for now
      '/placeholder-avatars/avatar2.png',
      '/placeholder-avatars/avatar3.png',
    ];
    const simulatedImageUrl = placeholderUrls[Math.floor(Math.random() * placeholderUrls.length)];
    console.log(`Simulating upload of ${selectedFile.name} for pet ${petId}. Using URL: ${simulatedImageUrl}`);

    await updatePetAvatar({ variables: { petId, imageUrl: simulatedImageUrl } });
  };

  useEffect(() => {
    if (!selectedFile) {
        setPreviewUrl(currentAvatarUrl || null);
    }
  }, [currentAvatarUrl, selectedFile]);

  const displayUrl = previewUrl || defaultPetAvatar;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--current-border-color)', borderRadius: '8px', marginTop: '1rem' }}>
      <h4>Pet Avatar</h4>
      <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--secondary-color)' }}>
        <Image
          src={displayUrl}
          alt="Pet Avatar"
          width={120}
          height={120}
          style={{ objectFit: 'cover' }}
          onError={() => {
            console.warn("Error loading pet image:", displayUrl, "Falling back to default pet avatar.");
            setPreviewUrl(defaultPetAvatar);
          }}
        />
      </div>

      {error && <p style={{ color: 'var(--error-color)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
      {successMessage && <p style={{ color: 'var(--success-color)', fontSize: '0.9rem', textAlign: 'center' }}>{successMessage}</p>}

      <input
        type="file"
        accept="image/png, image/jpeg, image/gif"
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="button-style secondary"
        style={{ minWidth: '160px' }}
      >
        Choose Image
      </button>

      {selectedFile && (
        <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
          <p>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>
          <button
            type="button"
            onClick={handleUpload}
            disabled={loading}
            className="button-style primary"
            style={{ minWidth: '160px' }}
          >
            {loading ? 'Saving...' : 'Save Avatar'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PetAvatarUpload;
