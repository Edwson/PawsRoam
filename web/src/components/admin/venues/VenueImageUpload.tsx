// web/src/components/admin/venues/VenueImageUpload.tsx
"use client";

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';
import Image from 'next/image';

// GraphQL Mutation for updating venue image
const ADMIN_UPDATE_VENUE_IMAGE_MUTATION = gql`
  mutation AdminUpdateVenueImage($venueId: ID!, $imageUrl: String!) {
    adminUpdateVenueImage(venueId: $venueId, imageUrl: $imageUrl) {
      id
      image_url # Ensure this is returned to update UI
      # Potentially other venue fields if needed
    }
  }
`;

interface VenueImageUploadProps {
  venueId: string;
  currentImageUrl?: string | null;
  onUploadSuccess: (newImageUrl: string) => void; // Callback to update parent state
}

const defaultVenueImage = "/default-venue-image.png"; // Path to a default venue image in /public

const VenueImageUpload: React.FC<VenueImageUploadProps> = ({ venueId, currentImageUrl, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [adminUpdateVenueImage, { loading }] = useMutation(ADMIN_UPDATE_VENUE_IMAGE_MUTATION, {
    onCompleted: (data) => {
      const newUrl = data.adminUpdateVenueImage?.image_url;
      if (newUrl) {
        setSuccessMessage('Venue image updated successfully!');
        setError(null);
        onUploadSuccess(newUrl);
        setSelectedFile(null);
      } else {
        setError("Failed to get updated image URL from server.");
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      setError(`Error updating venue image: ${err.message}`);
      setSuccessMessage(null);
      console.error("Error updating venue image:", err);
      setTimeout(() => setError(null), 5000);
    }
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Max 5MB for venue images example
        setError("File is too large. Maximum size is 5MB.");
        setSelectedFile(null);
        setPreviewUrl(currentImageUrl || null);
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError("Invalid file type. Please select an image (PNG, JPG, GIF, WebP).");
        setSelectedFile(null);
        setPreviewUrl(currentImageUrl || null);
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

    // Simulation of Upload
    const placeholderUrls = [
      'https://picsum.photos/seed/venueA/400/300',
      'https://picsum.photos/seed/venueB/400/300',
      '/placeholder-venue-images/venue1.jpg', // Assuming you add some to /public
      '/placeholder-venue-images/venue2.jpg',
    ];
    // const simulatedImageUrl = placeholderUrls[Math.floor(Math.random() * placeholderUrls.length)];
     // For stability in testing, using a more predictable placeholder:
    const simulatedImageUrl = `https://picsum.photos/seed/${venueId}/400/300`;
    console.log(`Simulating upload of ${selectedFile.name} for venue ${venueId}. Using URL: ${simulatedImageUrl}`);

    await adminUpdateVenueImage({ variables: { venueId, imageUrl: simulatedImageUrl } });
  };

  useEffect(() => {
    if (!selectedFile) { // Only update if no new file is selected for preview
        setPreviewUrl(currentImageUrl || null);
    }
  }, [currentImageUrl, selectedFile]);

  const displayUrl = previewUrl || defaultVenueImage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--current-border-color)', borderRadius: '8px', marginTop: '1rem' }}>
      <h4>Venue Main Image</h4>
      <div style={{ width: '100%', maxWidth: '300px', aspectRatio: '16/9', borderRadius: '4px', overflow: 'hidden', border: '2px solid var(--secondary-color)', position: 'relative' }}>
        <Image
          src={displayUrl}
          alt="Venue Image"
          layout="fill"
          objectFit="cover"
          onError={() => {
            console.warn("Error loading venue image:", displayUrl, "Falling back to default venue image.");
            setPreviewUrl(defaultVenueImage);
          }}
        />
      </div>

      {error && <p style={{ color: 'var(--error-color)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
      {successMessage && <p style={{ color: 'var(--success-color)', fontSize: '0.9rem', textAlign: 'center' }}>{successMessage}</p>}

      <input
        type="file"
        accept="image/png, image/jpeg, image/gif, image/webp"
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{ display: 'none' }}
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
            {loading ? 'Saving...' : 'Save Image'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VenueImageUpload;
