// web/src/components/profile/ProfilePictureUpload.tsx
"use client";

import React, { useState, useRef, ChangeEvent } from 'react';
import { gql, useMutation } from '@apollo/client';
import Image from 'next/image'; // For optimized image display

// GraphQL Mutation
const UPDATE_USER_PROFILE_PICTURE_MUTATION = gql`
  mutation UpdateUserProfilePicture($imageUrl: String!) {
    updateUserProfilePicture(imageUrl: $imageUrl) {
      id
      avatar_url # Ensure this is returned to update context or cache
      # Potentially other user fields if needed
    }
  }
`;

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string | null;
  onUploadSuccess: (newAvatarUrl: string) => void; // Callback to update parent state/context
}

const placeholderAvatar = "/default-avatar.png"; // Path to a default avatar in /public

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({ currentAvatarUrl, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [updateUserProfilePicture, { loading }] = useMutation(UPDATE_USER_PROFILE_PICTURE_MUTATION, {
    onCompleted: (data) => {
      const newUrl = data.updateUserProfilePicture?.avatar_url;
      if (newUrl) {
        setSuccessMessage('Profile picture updated successfully!');
        setError(null);
        onUploadSuccess(newUrl); // Notify parent
        setSelectedFile(null); // Clear selected file after successful upload
        // Preview URL is already set or will be updated by parent through props
      } else {
        setError("Failed to get updated avatar URL from server.");
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      setError(`Error updating profile picture: ${err.message}`);
      setSuccessMessage(null);
      console.error("Error updating profile picture:", err);
      setTimeout(() => setError(null), 5000);
    }
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Max 2MB example limit
        setError("File is too large. Maximum size is 2MB.");
        setSelectedFile(null);
        setPreviewUrl(currentAvatarUrl || null); // Reset preview to current avatar
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError("Invalid file type. Please select an image (PNG, JPG, GIF).");
        setSelectedFile(null);
        setPreviewUrl(currentAvatarUrl || null);
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Show client-side preview
      setError(null); // Clear previous errors
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

    // *** Simulation of Upload ***
    // In a real app, you'd upload `selectedFile` to a service (e.g., S3, Cloudinary)
    // and get back a URL. For this simulation, we'll use a placeholder.
    // To make it slightly dynamic, let's pick one of a few placeholders.
    const placeholderUrls = [
      'https://i.pravatar.cc/150?img=1', // Placeholder service
      'https://picsum.photos/seed/avatar1/150', // Another placeholder
      '/placeholder-avatars/avatar1.png', // Assuming you add some to /public/placeholder-avatars
      '/placeholder-avatars/avatar2.png',
      '/placeholder-avatars/avatar3.png',
    ];
    // For a more stable placeholder during testing, you might just use one.
    // const simulatedImageUrl = 'https://i.pravatar.cc/150?u=' + Date.now(); // Unique placeholder
    const simulatedImageUrl = placeholderUrls[Math.floor(Math.random() * placeholderUrls.length)];
    console.log(`Simulating upload of ${selectedFile.name}. Using URL: ${simulatedImageUrl}`);

    await updateUserProfilePicture({ variables: { imageUrl: simulatedImageUrl } });
  };

  // Update preview if currentAvatarUrl prop changes from parent
  useEffect(() => {
    if (!selectedFile) { // Only update if no new file is selected for preview
        setPreviewUrl(currentAvatarUrl || null);
    }
  }, [currentAvatarUrl, selectedFile]);

  const displayUrl = previewUrl || placeholderAvatar;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--current-border-color)', borderRadius: '8px' }}>
      <h4>Profile Picture</h4>
      <div style={{ width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary-color)' }}>
        <Image
          src={displayUrl}
          alt="Profile Avatar"
          width={150}
          height={150}
          style={{ objectFit: 'cover' }}
          onError={() => {
            // This can happen if the URL is invalid or image fails to load
            // Revert to a default placeholder if current preview/avatar fails
            console.warn("Error loading image:", displayUrl, "Falling back to default.");
            setPreviewUrl(placeholderAvatar);
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
        style={{ display: 'none' }} // Hide default input
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="button-style secondary"
        style={{ minWidth: '180px' }}
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
            style={{ minWidth: '180px' }}
          >
            {loading ? 'Saving...' : 'Save Picture'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfilePictureUpload;
