// web/src/app/admin/venues/edit/[venueId]/page.tsx
"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import AppProviders from '@/components/AppProviders';
import VenueForm from '@/components/admin/venues/VenueForm'; // Re-use the form

const EditVenuePageContent: React.FC = () => {
  const params = useParams();
  const venueId = params.venueId as string; // Extract venueId from route

  return (
    <div>
      <h2>Edit Venue (ID: {venueId})</h2>
      {venueId ? <VenueForm venueId={venueId} /> : <p>Loading venue ID...</p>}
    </div>
  );
};

const EditVenuePage = () => {
  return (
    <AppProviders>
      {/* AdminRouteGuard is handled by admin/layout.tsx */}
      <Layout>
        <EditVenuePageContent />
      </Layout>
    </AppProviders>
  );
};

export default EditVenuePage;
