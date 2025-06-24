// web/src/app/admin/venues/add/page.tsx
"use client";

import React from 'react';
// import { AdminRouteGuard } from '@/app/admin/AdminRouteGuard'; // Unused import
import Layout from '@/components/Layout';
import AppProviders from '@/components/AppProviders';
import VenueForm from '@/components/admin/venues/VenueForm'; // Create this form component

const AddVenuePageContent: React.FC = () => {
  return (
    <div>
      <h2>Add New Venue</h2>
      <VenueForm />
    </div>
  );
};

const AddVenuePage = () => {
  return (
    <AppProviders>
      {/* AdminRouteGuard might not be needed here if admin/layout.tsx handles it */}
      {/* <AdminRouteGuard> */}
        <Layout>
          <AddVenuePageContent />
        </Layout>
      {/* </AdminRouteGuard> */}
    </AppProviders>
  );
};

export default AddVenuePage;
