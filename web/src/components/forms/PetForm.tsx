'use client';

import React, { useState, FormEvent, useEffect } from 'react';

// Define the structure for pet data, aligning with GQL input types
export interface PetFormData {
  name: string;
  species: string;
  breed?: string;
  birthdate?: string; // YYYY-MM-DD format
  avatar_url?: string;
  notes?: string;
}

interface PetFormProps {
  initialData?: Partial<PetFormData>; // Optional: for pre-filling form in edit mode
  onSubmitFunction: (formData: PetFormData) => Promise<void>; // Async to handle mutation
  submitButtonText?: string;
  isLoading?: boolean; // To disable form during submission
  // We might add children here for more complex layouts or additional buttons like AI suggester
  children?: React.ReactNode;
}

const availableSpecies = ["Dog", "Cat", "Bird", "Rabbit", "Fish", "Reptile", "Other"];

const PetForm: React.FC<PetFormProps> = ({
  initialData,
  onSubmitFunction,
  submitButtonText = 'Save Pet',
  isLoading = false,
  children, // For placing AI suggester button etc.
}) => {
  const [formData, setFormData] = useState<PetFormData>({
    name: '',
    species: availableSpecies[0], // Default to first species
    breed: '',
    birthdate: '',
    avatar_url: '',
    notes: '',
    ...initialData, // Spread initialData to override defaults if provided
  });

  // Update form if initialData changes (e.g., when editing and data loads)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev, // Keep existing fields if not in initialData (though usually all are there for edit)
        name: initialData.name || '',
        species: initialData.species || availableSpecies[0],
        breed: initialData.breed || '',
        birthdate: initialData.birthdate || '',
        avatar_url: initialData.avatar_url || '',
        notes: initialData.notes || '',
      }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.species) {
      alert("Name and Species are required."); // Simple validation for now
      return;
    }
    await onSubmitFunction(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form-layout" style={{ maxWidth: '600px', margin: '0 auto' }}> {/* Basic form layout class */}
      <div>
        <label htmlFor="name">Pet&apos;s Name:</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
                style={{ flexGrow: 1 }}
            />
            {/* Placeholder for children like AI Suggestion button */}
            {children && React.Children.map(children, child =>
                React.isValidElement(child) && child.props.fieldName === 'name' ? child : null
            )}
        </div>
      </div>

      <div>
        <label htmlFor="species">Species:</label>
        <select
          id="species"
          name="species"
          value={formData.species}
          onChange={handleChange}
          required
          disabled={isLoading}
        >
          {availableSpecies.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="breed">Breed (Optional):</label>
        <input
          type="text"
          id="breed"
          name="breed"
          value={formData.breed}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="birthdate">Birthdate (Optional):</label>
        <input
          type="date"
          id="birthdate"
          name="birthdate"
          value={formData.birthdate}
          onChange={handleChange}
          disabled={isLoading}
          max={new Date().toISOString().split("T")[0]} // Prevent future dates
        />
      </div>

      <div>
        <label htmlFor="avatar_url">Avatar URL (Optional):</label>
        <input
          type="url"
          id="avatar_url"
          name="avatar_url"
          placeholder="https://example.com/image.png"
          value={formData.avatar_url}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="notes">Notes (Optional):</label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          value={formData.notes}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <button type="submit" className="button-style" disabled={isLoading} style={{ marginTop: '1rem', width: '100%' }}>
        {isLoading ? 'Saving...' : submitButtonText}
      </button>
    </form>
  );
};

export default PetForm;
