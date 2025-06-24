// web/src/app/alerts/create/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppProviders from '@/components/AppProviders';
import Layout from '@/components/Layout';
// import styles from './CreateAlert.module.css'; // We'll create this CSS module

// GraphQL Mutation for creating a pet alert
const CREATE_PET_ALERT_MUTATION = gql`
  mutation CreatePetAlert($input: CreatePetAlertInput!) {
    createPetAlert(input: $input) {
      id
      alert_type
      status
      # Potentially other fields to confirm creation or for immediate display
    }
  }
`;

// Define the structure for the form data
interface PetAlertFormData {
  alert_type: string;
  description: string;
  latitude: number | string; // Allow string for input, parse to float on submit
  longitude: number | string;
  location_accuracy?: number | string | null;
  pet_name?: string | null;
  pet_species?: string | null;
  pet_breed?: string | null;
  pet_image_url?: string | null; // For now, manual URL input
  contact_phone?: string | null;
  contact_email?: string | null;
  last_seen_at?: string | null; // ISO DateTime string
}

// Interface for the object structure sent to the mutation
interface SubmittedPetAlertInput {
  alert_type: string;
  description: string;
  latitude: number;
  longitude: number;
  location_accuracy?: number | null;
  pet_name?: string | null;
  pet_species?: string | null;
  pet_breed?: string | null;
  pet_image_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  last_seen_at?: string | null;
}

const initialFormData: PetAlertFormData = {
  alert_type: 'lost_pet', // Default type
  description: '',
  latitude: '',
  longitude: '',
  location_accuracy: '',
  pet_name: '',
  pet_species: '',
  pet_breed: '',
  pet_image_url: '',
  contact_phone: '',
  contact_email: '',
  last_seen_at: '',
};

// Basic inline styles for now, can move to CSS module
const formContainerStyle: React.CSSProperties = {
  maxWidth: '700px',
  margin: '2rem auto',
  padding: '2rem',
  backgroundColor: 'var(--current-surface)',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};
const formGroupStyle: React.CSSProperties = { marginBottom: '1.25rem' };
const labelStyle: React.CSSProperties = { display: 'block', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-color)' };
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem', borderRadius: '4px',
    border: '1px solid var(--current-border-color)', fontSize: '1rem',
    backgroundColor: 'var(--input-bg-color)', color: 'var(--input-text-color)'
};
const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: '100px', resize: 'vertical' };
// const buttonStyle: React.CSSProperties = { /* Defined by .button-style.primary */ }; // Unused variable


const CreateAlertPageContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<PetAlertFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createPetAlert, { loading: mutationLoading }] = useMutation(CREATE_PET_ALERT_MUTATION, {
    onCompleted: (data) => {
      setSuccessMessage(`Alert "${data.createPetAlert.alert_type}" created successfully! Status: ${data.createPetAlert.status}.`);
      setFormData(initialFormData); // Reset form
      // router.push('/profile/my-alerts'); // Or redirect to the alert details page
      setTimeout(() => {
        setSuccessMessage(null);
        // Potentially redirect after message
        router.push('/profile/my-alerts?alertCreated=true');
      }, 3000);
    },
    onError: (error) => {
      setFormError(error.message);
      setSuccessMessage(null);
      setTimeout(() => setFormError(null), 5000);
    }
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?message=Please log in to create an alert.');
    }
  }, [user, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
     if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    location_accuracy: position.coords.accuracy
                }));
                setFormError(null);
            },
            (error) => {
                setFormError(`Error getting location: ${error.message}`);
            }
        );
    } else {
        setFormError("Geolocation is not supported by this browser.");
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!formData.alert_type || !formData.description || !formData.latitude || !formData.longitude) {
      setFormError("Alert Type, Description, Latitude, and Longitude are required.");
      return;
    }

    const inputToSubmit: SubmittedPetAlertInput = { ...formData } as unknown as SubmittedPetAlertInput;
    // Convert numeric fields from string if necessary, ensure null for empty optionals
    inputToSubmit.latitude = parseFloat(String(formData.latitude));
    inputToSubmit.longitude = parseFloat(String(formData.longitude));
    inputToSubmit.location_accuracy = formData.location_accuracy ? parseInt(String(formData.location_accuracy), 10) : null;

    ['pet_name', 'pet_species', 'pet_breed', 'pet_image_url', 'contact_phone', 'contact_email', 'last_seen_at'].forEach(field => {
        if (inputToSubmit[field] === '') inputToSubmit[field] = null;
    });
    if (inputToSubmit.last_seen_at && !inputToSubmit.last_seen_at.endsWith('Z')) {
        inputToSubmit.last_seen_at = new Date(inputToSubmit.last_seen_at).toISOString();
    }


    createPetAlert({ variables: { input: inputToSubmit } });
  };

  if (authLoading || !user) {
    return <p style={{textAlign: 'center', padding: '2rem'}}>Loading...</p>;
  }

  return (
    <div style={formContainerStyle}>
      <h1 style={{color: 'var(--accent-color)', textAlign:'center', marginBottom:'1.5rem'}}>Create Pet Alert</h1>
      <p style={{textAlign:'center', marginBottom:'1.5rem', color:'var(--text-color-muted)'}}>
        Report a lost pet, found pet, or a pet in danger. Your alert will help our PawsSafer network respond.
      </p>

      {formError && <p className="error-message" style={{marginBottom:'1rem'}}>{formError}</p>}
      {successMessage && <p className="success-message" style={{marginBottom:'1rem', backgroundColor: 'var(--success-bg-color)', color: 'var(--success-color)', border: '1px solid var(--success-color)', padding: '1rem', borderRadius: '4px'}}>{successMessage}</p>}

      <form onSubmit={handleSubmit}>
        <div style={formGroupStyle}>
          <label htmlFor="alert_type" style={labelStyle}>Alert Type*:</label>
          <select name="alert_type" id="alert_type" value={formData.alert_type} onChange={handleChange} required style={inputStyle}>
            <option value="lost_pet">Lost Pet</option>
            <option value="found_pet">Found Pet</option>
            <option value="pet_in_danger">Pet in Danger</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={formGroupStyle}>
          <label htmlFor="description" style={labelStyle}>Description* (Details, last seen, appearance, etc.):</label>
          <textarea name="description" id="description" value={formData.description} onChange={handleChange} required style={textareaStyle} />
        </div>

        <div style={{display: 'flex', gap: '1rem', marginBottom: '0.5rem'}}>
            <div style={{...formGroupStyle, flex: 1}}>
            <label htmlFor="latitude" style={labelStyle}>Latitude*:</label>
            <input type="number" step="any" name="latitude" id="latitude" value={formData.latitude} onChange={handleChange} required style={inputStyle} />
            </div>
            <div style={{...formGroupStyle, flex: 1}}>
            <label htmlFor="longitude" style={labelStyle}>Longitude*:</label>
            <input type="number" step="any" name="longitude" id="longitude" value={formData.longitude} onChange={handleChange} required style={inputStyle} />
            </div>
        </div>
         <button type="button" onClick={handleUseCurrentLocation} className="button-style secondary" style={{marginBottom: '1.25rem', fontSize: '0.9rem'}}>
            📍 Use My Current Location
        </button>


        <h3 style={{color: 'var(--primary-dark)', marginTop: '1.5rem', borderTop: '1px solid var(--current-border-color)', paddingTop: '1rem'}}>Optional Pet Details</h3>
        <div style={formGroupStyle}>
          <label htmlFor="pet_name" style={labelStyle}>Pet&apos;s Name:</label>
          <input type="text" name="pet_name" id="pet_name" value={formData.pet_name || ''} onChange={handleChange} style={inputStyle} />
        </div>
        <div style={{display: 'flex', gap: '1rem'}}>
            <div style={{...formGroupStyle, flex: 1}}>
            <label htmlFor="pet_species" style={labelStyle}>Species (e.g., Dog, Cat):</label>
            <input type="text" name="pet_species" id="pet_species" value={formData.pet_species || ''} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{...formGroupStyle, flex: 1}}>
            <label htmlFor="pet_breed" style={labelStyle}>Breed:</label>
            <input type="text" name="pet_breed" id="pet_breed" value={formData.pet_breed || ''} onChange={handleChange} style={inputStyle} />
            </div>
        </div>
        <div style={formGroupStyle}>
          <label htmlFor="pet_image_url" style={labelStyle}>Pet Image URL (direct link to image):</label>
          <input type="url" name="pet_image_url" id="pet_image_url" value={formData.pet_image_url || ''} onChange={handleChange} style={inputStyle} placeholder="https://example.com/image.jpg"/>
        </div>
         <div style={formGroupStyle}>
          <label htmlFor="last_seen_at" style={labelStyle}>Last Seen At (Date and Time):</label>
          <input type="datetime-local" name="last_seen_at" id="last_seen_at" value={formData.last_seen_at || ''} onChange={handleChange} style={inputStyle} />
        </div>


        <h3 style={{color: 'var(--primary-dark)', marginTop: '1.5rem', borderTop: '1px solid var(--current-border-color)', paddingTop: '1rem'}}>Optional Contact Info (for this alert)</h3>
         <div style={{display: 'flex', gap: '1rem'}}>
            <div style={{...formGroupStyle, flex: 1}}>
            <label htmlFor="contact_phone" style={labelStyle}>Contact Phone:</label>
            <input type="tel" name="contact_phone" id="contact_phone" value={formData.contact_phone || ''} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{...formGroupStyle, flex: 1}}>
            <label htmlFor="contact_email" style={labelStyle}>Contact Email:</label>
            <input type="email" name="contact_email" id="contact_email" value={formData.contact_email || ''} onChange={handleChange} style={inputStyle} />
            </div>
        </div>


        <button type="submit" disabled={mutationLoading || authLoading} className="button-style primary" style={{width: '100%', padding: '0.8rem', marginTop: '1.5rem', fontSize: '1.1rem'}}>
          {mutationLoading ? 'Submitting Alert...' : 'Submit Alert'}
        </button>
      </form>
    </div>
  );
};


const CreateAlertPage = () => {
  return (
    <AppProviders>
      <Layout>
        <CreateAlertPageContent />
      </Layout>
    </AppProviders>
  );
}

export default CreateAlertPage;
