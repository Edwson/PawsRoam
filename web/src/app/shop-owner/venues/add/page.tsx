// web/src/app/shop-owner/venues/add/page.tsx
"use client";

import React from 'react';
import VenueForm from '@/components/admin/venues/VenueForm'; // Reusing the admin form component
import { useRouter } from 'next/navigation'; // To redirect after submission

// ShopOwnerLayout will handle AppProviders, Layout, and auth guard

const AddVenueByShopOwnerPageContent: React.FC = () => {
  const router = useRouter();

  const handleVenueCreated = () => {
    // Redirect to the 'My Venues' list page with a success indicator
    // The My Venues page can then show a temporary success message.
    router.push('/shop-owner/venues?venueAdded=true');
  };

  return (
    <div>
      <h1 style={{color: 'var(--primary-color)', borderBottom: '1px solid var(--current-border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
        Add Your New Venue
      </h1>
      <p style={{marginBottom: '1.5rem', color: 'var(--text-color-muted)'}}>
        Please provide the details for your pet-friendly venue. All new submissions will be reviewed before becoming publicly visible.
      </p>

      <VenueForm
        // No venueId is passed, so VenueForm operates in "create" mode.
        // We need to tell VenueForm to use the shopOwnerCreateVenue mutation.
        mutationType="shopOwnerCreateVenue"
        onSuccess={handleVenueCreated} // Callback on successful creation
      />
    </div>
  );
};

const AddVenueByShopOwnerPage = () => {
    return <AddVenueByShopOwnerPageContent />;
}

export default AddVenueByShopOwnerPage;
