// web/src/components/admin/venues/VenueForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gql, useMutation, useQuery } from '@apollo/client';
import { AdminCreateVenueInput, AdminUpdateVenueInput, Venue as VenueType } from '@/lib/types';

const ADMIN_CREATE_VENUE_MUTATION = gql`
  mutation AdminCreateVenue($input: AdminCreateVenueInput!) {
    adminCreateVenue(input: $input) {
      id # Request fields needed after creation, e.g., to redirect or confirm
      name
    }
  }
`;

const ADMIN_UPDATE_VENUE_MUTATION = gql`
  mutation AdminUpdateVenue($id: ID!, $input: AdminUpdateVenueInput!) {
    adminUpdateVenue(id: $id, input: $input) {
      id # Request fields needed after update
      name
      # Potentially all fields to update cache, or refetch
    }
  }
`;

const GET_VENUE_BY_ID_QUERY = gql`
  query GetVenueByIdForAdmin($id: ID!) {
    getVenueById(id: $id) {
      id
      owner_user_id
      name
      address
      city
      state_province
      postal_code
      country
      latitude
      longitude
      phone_number
      website
      description
      opening_hours
      type
      pet_policy_summary
      pet_policy_details
      allows_off_leash
      has_indoor_seating_for_pets
      has_outdoor_seating_for_pets
      water_bowls_provided
      pet_treats_available
      pet_menu_available
      dedicated_pet_area
      weight_limit_kg
      carrier_required
      additional_pet_services
      status
      google_place_id
      image_url # Ensure image_url is fetched
    }
  }
`;


interface VenueFormProps {
  venueId?: string; // If provided, it's an edit form
}

// Define initial state structure matching AdminCreateVenueInput but with appropriate defaults
const initialFormData: AdminCreateVenueInput = {
  name: '',
  type: '', // Default to a common type or make it required
  latitude: 0,
  longitude: 0,
  address: '',
  city: '',
  state_province: '',
  postal_code: '',
  country: '',
  phone_number: '',
  website: '',
  description: '',
  opening_hours: null, // Or empty JSON string like '{}'
  pet_policy_summary: '',
  pet_policy_details: '',
  allows_off_leash: false,
  has_indoor_seating_for_pets: false,
  has_outdoor_seating_for_pets: false,
  water_bowls_provided: false,
  pet_treats_available: false,
  pet_menu_available: false,
  dedicated_pet_area: false,
  weight_limit_kg: 0, // Or null if your DB/type allows
  carrier_required: false,
  additional_pet_services: '',
  status: 'pending_approval', // Default status
  google_place_id: '',
  owner_user_id: '',
};


const VenueForm: React.FC<VenueFormProps> = ({ venueId }) => {
  const router = useRouter();
  const isEditMode = !!venueId;
  const [formData, setFormData] = useState<AdminCreateVenueInput | AdminUpdateVenueInput>(initialFormData);
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Fetch venue data if in edit mode
  const { data: venueData, loading: queryLoading, error: queryError } = useQuery<{ getVenueById: VenueType }>(
    GET_VENUE_BY_ID_QUERY,
    {
      variables: { id: venueId },
      skip: !isEditMode, // Skip if not in edit mode
      onCompleted: (data) => {
        if (data && data.getVenueById) {
          // Prepare data for form: nulls to empty strings, numbers for number inputs
          const fetchedVenue = data.getVenueById;
          const preparedFormData: any = {};
          Object.keys(initialFormData).forEach(key => {
            const formKey = key as keyof AdminCreateVenueInput; // Use AdminCreateVenueInput here
            const fetchedValue = fetchedVenue[formKey as keyof VenueType]; // Access fetchedVenue with a key of VenueType

            if (fetchedValue !== null && fetchedValue !== undefined) {
                 if (typeof initialFormData[formKey] === 'number' && typeof fetchedValue === 'string') {
                    preparedFormData[formKey] = parseFloat(fetchedValue as string) || 0;
                 } else if (typeof initialFormData[formKey] === 'boolean' ) {
                    preparedFormData[formKey] = Boolean(fetchedValue);
                 }
                 else {
                    preparedFormData[formKey] = fetchedValue;
                 }
            } else {
                // Use initialFormData defaults for null/undefined fields from fetched data
                preparedFormData[formKey] = initialFormData[formKey];
            }
          });
           // Ensure lat/lng are numbers (fetchedVenue values might be strings if not parsed by Apollo)
          preparedFormData.latitude = parseFloat(fetchedVenue.latitude as any) || 0;
          preparedFormData.longitude = parseFloat(fetchedVenue.longitude as any) || 0;
          preparedFormData.weight_limit_kg = fetchedVenue.weight_limit_kg ? parseFloat(fetchedVenue.weight_limit_kg as any) : null;


          setFormData(preparedFormData as AdminCreateVenueInput); // Set as AdminCreateVenueInput
        }
      }
    }
  );

  const [adminCreateVenue, { loading: createLoading }] = useMutation(ADMIN_CREATE_VENUE_MUTATION, {
    onCompleted: () => {
      setFeedbackMessage({type: 'success', message: 'Venue created successfully! Redirecting...'});
      setTimeout(() => router.push('/admin/venues'), 2000);
    },
    onError: (err) => setFeedbackMessage({type: 'error', message: `Error creating venue: ${err.message}`}),
  });

  const [adminUpdateVenue, { loading: updateLoading }] = useMutation(ADMIN_UPDATE_VENUE_MUTATION, {
    onCompleted: () => {
      setFeedbackMessage({type: 'success', message: 'Venue updated successfully! Redirecting...'});
      setTimeout(() => router.push('/admin/venues'), 2000);
    },
    onError: (err) => setFeedbackMessage({type: 'error', message: `Error updating venue: ${err.message}`}),
  });

  const loading = createLoading || updateLoading || queryLoading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean | null = value;

    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      processedValue = value === '' ? null : parseFloat(value); // Allow empty string to become null for optional numbers
    } else if (name === 'opening_hours') {
        try {
            processedValue = value.trim() === '' ? null : JSON.parse(value);
        } catch (jsonError) {
            console.warn("Invalid JSON for opening hours:", value);
            // Keep as string for now, or set specific error for this field
            // For simplicity, we'll let backend validate JSON or use a more robust JSON editor component
        }
    }


    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    // Basic validation example (more robust validation should be added)
    if (!formData.name || !formData.type || formData.latitude === null || formData.longitude === null) {
      setFeedbackMessage({type: 'error', message: 'Name, Type, Latitude, and Longitude are required.'});
      return;
    }

    // Prepare data for mutation (e.g. ensure numbers are numbers)
    const submissionData: any = { ...formData };
    submissionData.latitude = parseFloat(String(formData.latitude));
    submissionData.longitude = parseFloat(String(formData.longitude));
    if (formData.weight_limit_kg !== null && formData.weight_limit_kg !== undefined) {
        submissionData.weight_limit_kg = parseFloat(String(formData.weight_limit_kg));
    } else {
        submissionData.weight_limit_kg = null;
    }
     // Handle empty strings for optional fields by converting them to null
    Object.keys(submissionData).forEach(key => {
        if (submissionData[key] === '') {
            const initialField = initialFormData[key as keyof AdminCreateVenueInput];
            // Only set to null if it's not a boolean and not a required number like lat/lng
            if (typeof initialField !== 'boolean' && key !== 'latitude' && key !== 'longitude') {
                 submissionData[key] = null;
            }
        }
    });


    if (isEditMode) {
      // Prepare payload for AdminUpdateVenueInput. It should only contain fields present in AdminUpdateVenueInput.
      // And changed fields ideally, but for simplicity, we send all form fields that are part of the input type.
      const updatePayload: AdminUpdateVenueInput = { ...submissionData };
      // Remove any fields not part of AdminUpdateVenueInput explicitly if necessary,
      // though GraphQL should ignore extra fields if not strictly typed on resolver.
      // Example: if 'id' or 'created_at' were part of submissionData erroneously.
      // delete (updatePayload as any).id;
      // delete (updatePayload as any).created_at;
      // ...etc. for fields not in AdminUpdateVenueInput

      adminUpdateVenue({ variables: { id: venueId, input: updatePayload } });
    } else {
      adminCreateVenue({ variables: { input: submissionData as AdminCreateVenueInput } });
    }
  };

  if (queryLoading && isEditMode) return <p>Loading venue data...</p>;
  if (queryError) return <p className="error-message">Error loading venue for editing: {queryError.message}</p>;

  // Styling (can be moved to CSS modules)
  const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '700px', margin: 'auto' };
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
  const inputStyle: React.CSSProperties = { padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' };
  const checkboxContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5rem' };


  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      {feedbackMessage && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '4px',
          backgroundColor: feedbackMessage.type === 'success' ? 'var(--success-bg-color)' : 'var(--error-bg-color)',
          color: feedbackMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)',
          border: `1px solid ${feedbackMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`
        }}>
          {feedbackMessage.message}
        </div>
      )}

      <div style={fieldStyle}>
        <label htmlFor="name">Name*:</label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required style={inputStyle} />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="type">Type*:</label>
        <select name="type" id="type" value={formData.type} onChange={handleChange} required style={inputStyle}>
          <option value="">Select Type</option>
          <option value="cafe">Cafe</option>
          <option value="park">Park</option>
          <option value="store">Store</option>
          <option value="restaurant">Restaurant</option>
          <option value="hotel">Hotel</option>
          <option value="groomer">Groomer</option>
          <option value="veterinarian">Veterinarian</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div style={{display: 'flex', gap: '1rem'}}>
        <div style={{...fieldStyle, flex: 1}}>
            <label htmlFor="latitude">Latitude*:</label>
            <input type="number" step="any" name="latitude" id="latitude" value={formData.latitude || ''} onChange={handleChange} required style={inputStyle} />
        </div>
        <div style={{...fieldStyle, flex: 1}}>
            <label htmlFor="longitude">Longitude*:</label>
            <input type="number" step="any" name="longitude" id="longitude" value={formData.longitude || ''} onChange={handleChange} required style={inputStyle} />
        </div>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="address">Address:</label>
        <input type="text" name="address" id="address" value={formData.address || ''} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={{display: 'flex', gap: '1rem'}}>
        <div style={{...fieldStyle, flex: 1}}>
            <label htmlFor="city">City:</label>
            <input type="text" name="city" id="city" value={formData.city || ''} onChange={handleChange} style={inputStyle} />
        </div>
        <div style={{...fieldStyle, flex: 1}}>
            <label htmlFor="state_province">State/Province:</label>
            <input type="text" name="state_province" id="state_province" value={formData.state_province || ''} onChange={handleChange} style={inputStyle} />
        </div>
      </div>
       <div style={{display: 'flex', gap: '1rem'}}>
        <div style={{...fieldStyle, flex: 1}}>
            <label htmlFor="postal_code">Postal Code:</label>
            <input type="text" name="postal_code" id="postal_code" value={formData.postal_code || ''} onChange={handleChange} style={inputStyle} />
        </div>
        <div style={{...fieldStyle, flex: 1}}>
            <label htmlFor="country">Country:</label>
            <input type="text" name="country" id="country" value={formData.country || ''} onChange={handleChange} style={inputStyle} />
        </div>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="phone_number">Phone Number:</label>
        <input type="tel" name="phone_number" id="phone_number" value={formData.phone_number || ''} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={fieldStyle}>
        <label htmlFor="website">Website (include http/https):</label>
        <input type="url" name="website" id="website" value={formData.website || ''} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={fieldStyle}>
        <label htmlFor="description">Description:</label>
        <textarea name="description" id="description" value={formData.description || ''} onChange={handleChange} style={{...inputStyle, minHeight: '80px'}} />
      </div>
       <div style={fieldStyle}>
        <label htmlFor="opening_hours">Opening Hours (JSON format):</label>
        <textarea name="opening_hours" id="opening_hours" value={formData.opening_hours ? JSON.stringify(formData.opening_hours, null, 2) : ''} onChange={handleChange} style={{...inputStyle, minHeight: '100px', fontFamily: 'monospace'}} placeholder='e.g., {"monday": "9am-5pm", "tuesday": "9am-5pm"}' />
      </div>

      <h3>Pet Policies</h3>
      <div style={fieldStyle}>
        <label htmlFor="pet_policy_summary">Pet Policy Summary:</label>
        <input type="text" name="pet_policy_summary" id="pet_policy_summary" value={formData.pet_policy_summary || ''} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={fieldStyle}>
        <label htmlFor="pet_policy_details">Pet Policy Details:</label>
        <textarea name="pet_policy_details" id="pet_policy_details" value={formData.pet_policy_details || ''} onChange={handleChange} style={{...inputStyle, minHeight: '80px'}} />
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div style={checkboxContainerStyle}>
            <input type="checkbox" name="allows_off_leash" id="allows_off_leash" checked={!!formData.allows_off_leash} onChange={handleChange} />
            <label htmlFor="allows_off_leash">Allows Off-Leash</label>
        </div>
        <div style={checkboxContainerStyle}>
            <input type="checkbox" name="has_indoor_seating_for_pets" id="has_indoor_seating_for_pets" checked={!!formData.has_indoor_seating_for_pets} onChange={handleChange} />
            <label htmlFor="has_indoor_seating_for_pets">Indoor Seating for Pets</label>
        </div>
        <div style={checkboxContainerStyle}>
            <input type="checkbox" name="has_outdoor_seating_for_pets" id="has_outdoor_seating_for_pets" checked={!!formData.has_outdoor_seating_for_pets} onChange={handleChange} />
            <label htmlFor="has_outdoor_seating_for_pets">Outdoor Seating for Pets</label>
        </div>
        <div style={checkboxContainerStyle}>
            <input type="checkbox" name="water_bowls_provided" id="water_bowls_provided" checked={!!formData.water_bowls_provided} onChange={handleChange} />
            <label htmlFor="water_bowls_provided">Water Bowls Provided</label>
        </div>
        <div style={checkboxContainerStyle}>
            <input type="checkbox" name="pet_treats_available" id="pet_treats_available" checked={!!formData.pet_treats_available} onChange={handleChange} />
            <label htmlFor="pet_treats_available">Pet Treats Available</label>
        </div>
        <div style={checkboxContainerStyle}>
            <input type="checkbox" name="pet_menu_available" id="pet_menu_available" checked={!!formData.pet_menu_available} onChange={handleChange} />
            <label htmlFor="pet_menu_available">Pet Menu Available</label>
        </div>
        <div style={checkboxContainerStyle}>
            <input type="checkbox" name="dedicated_pet_area" id="dedicated_pet_area" checked={!!formData.dedicated_pet_area} onChange={handleChange} />
            <label htmlFor="dedicated_pet_area">Dedicated Pet Area</label>
        </div>
         <div style={checkboxContainerStyle}>
            <input type="checkbox" name="carrier_required" id="carrier_required" checked={!!formData.carrier_required} onChange={handleChange} />
            <label htmlFor="carrier_required">Carrier Required</label>
        </div>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="weight_limit_kg">Weight Limit (kg) (0 or empty for no limit):</label>
        <input type="number" step="any" name="weight_limit_kg" id="weight_limit_kg" value={formData.weight_limit_kg ?? ''} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={fieldStyle}>
        <label htmlFor="additional_pet_services">Additional Pet Services:</label>
        <textarea name="additional_pet_services" id="additional_pet_services" value={formData.additional_pet_services || ''} onChange={handleChange} style={{...inputStyle, minHeight: '60px'}} />
      </div>

      <h3>Admin Fields</h3>
       <div style={fieldStyle}>
        <label htmlFor="status">Status:</label>
        <select name="status" id="status" value={formData.status || 'pending_approval'} onChange={handleChange} style={inputStyle}>
          <option value="active">Active</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div style={fieldStyle}>
        <label htmlFor="google_place_id">Google Place ID:</label>
        <input type="text" name="google_place_id" id="google_place_id" value={formData.google_place_id || ''} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={fieldStyle}>
        <label htmlFor="owner_user_id">Owner User ID (Optional):</label>
        <input type="text" name="owner_user_id" id="owner_user_id" value={formData.owner_user_id || ''} onChange={handleChange} style={inputStyle} />
      </div>


      <button type="submit" disabled={loading} className="button-style primary" style={{marginTop: '1rem', padding: '0.75rem'}}>
        {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Venue' : 'Create Venue')}
      </button>
    </form>
  );
};

export default VenueForm;
