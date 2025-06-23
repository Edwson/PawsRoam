'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { gql, useLazyQuery } from '@apollo/client'; // Import useLazyQuery

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
  // children,
}) => {
  const [formData, setFormData] = useState<PetFormData>({
    name: '',
    species: availableSpecies[0],
    breed: '',
    birthdate: '',
    avatar_url: '',
    notes: '',
    ...initialData,
  });
  const [characteristics, setCharacteristics] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const SUGGEST_PET_NAME_QUERY = gql`
    query SuggestPetName($species: String!, $characteristics: [String]) {
      suggestPetName(species: $species, characteristics: $characteristics)
    }
  `;

  const [
    executeSuggestNameQuery,
    { loading: suggestionsLoading, error: suggestionsQueryError, data: suggestionsData }
  ] = useLazyQuery(SUGGEST_PET_NAME_QUERY, {
    onCompleted: (data) => {
      if (data && data.suggestPetName && data.suggestPetName.length > 0) {
        setNameSuggestions(data.suggestPetName);
        setSuggestionError(null);
      } else {
        setNameSuggestions([]);
        setSuggestionError("No suggestions found, try different characteristics!");
      }
    },
    onError: (err) => {
      setNameSuggestions([]);
      setSuggestionError(`Error fetching suggestions: ${err.message}`);
    }
  });

  const handleSuggestNames = () => {
    if (!formData.species) {
      setSuggestionError("Please select a species first.");
      return;
    }
    setSuggestionError(null);
    setNameSuggestions([]); // Clear previous suggestions

    const charsArray = characteristics.split(',').map(c => c.trim()).filter(c => c);
    executeSuggestNameQuery({ variables: { species: formData.species, characteristics: charsArray } });
  };

  // Update form if initialData changes
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
            {/* AI Name Suggestion Button will be added here in the next step */}
        </div>
      </div>

      {/* Name Suggestion Section - only show when adding, not editing (based on initialData) */}
      {!initialData?.id && (
        <div style={{
          marginBottom: '1.5rem', // Increased bottom margin for overall section
          marginTop: '0.5rem',
          padding: '1rem', // Added padding to the wrapper
          border: '1px dashed var(--current-border-color)', // Dashed border to make it look like an optional/helper section
          borderRadius: '4px'
        }}>
          <label htmlFor="characteristics">Characteristics (for name suggestion, e.g., playful, fluffy):</label>
          <input
            type="text"
            id="characteristics"
            name="characteristics"
            value={characteristics}
            onChange={(e) => setCharacteristics(e.target.value)}
            disabled={isLoading}
            placeholder="e.g., playful, loyal, tiny"
          />
          <button
            type="button"
            onClick={handleSuggestNames}
            disabled={isLoading || suggestionsLoading || !formData.species}
            className="button-style"
            style={{ marginTop: '0.5rem', backgroundColor: 'var(--accent-color)', width: '100%' }} // Make button full width
          >
            {suggestionsLoading ? 'Suggesting...' : 'Suggest Names ✨'}
          </button>

          {suggestionError && <p className="error-message" style={{marginTop: '0.75rem', marginBottom: '0'}}>{suggestionError}</p>}

          {nameSuggestions.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--current-border-color)', paddingTop: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontWeight: '500', fontSize: '1rem', color: 'var(--primary-dark)' }}>Pick a Name:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {nameSuggestions.map((name, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, name: name }));
                        setNameSuggestions([]);
                        setSuggestionError(null);
                      }}
                      className="button-style" // Use base button style
                      style={{
                        backgroundColor: 'var(--current-surface)', // Lighter background for selection
                        color: 'var(--primary-color)', // Primary color for text
                        border: '1px solid var(--primary-color)', // Primary border
                        padding: '0.4rem 0.8rem', // Consistent padding
                        fontSize: '0.9rem',
                        fontWeight: 'normal',
                      }}
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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
