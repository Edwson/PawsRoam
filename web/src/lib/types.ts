// web/src/lib/types.ts

// Based on GraphQL Schema in backend/src/graphql/schema.graphql

export interface VenueUser { // Simplified from User type for specific contexts if needed
  id: string;
  name?: string | null;
  email: string;
}

export interface VenueReview { // Simplified from Review type
  id: string;
  rating: number;
  comment?: string | null;
  visit_date?: string | null;
  user: VenueUser;
  created_at: string;
}

// Corresponds to `AdminCreateVenueInput` in GraphQL schema
export interface AdminCreateVenueInput {
  owner_user_id?: string | null;
  name: string;
  address?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
  phone_number?: string | null;
  website?: string | null;
  description?: string | null;
  opening_hours?: any | null; // JSON scalar - using 'any' as it can be complex and is often stringified then parsed.
  type: string;
  pet_policy_summary?: string | null;
  pet_policy_details?: string | null;
  allows_off_leash?: boolean | null;
  has_indoor_seating_for_pets?: boolean | null;
  has_outdoor_seating_for_pets?: boolean | null;
  water_bowls_provided?: boolean | null;
  pet_treats_available?: boolean | null;
  pet_menu_available?: boolean | null;
  dedicated_pet_area?: boolean | null;
  weight_limit_kg?: number | null;
  carrier_required?: boolean | null;
  additional_pet_services?: string | null;
  status?: string | null; // e.g., 'active', 'pending_approval'
  google_place_id?: string | null;
}

// Corresponds to `AdminUpdateVenueInput` in GraphQL schema
// It's a partial of AdminCreateVenueInput, but all fields are optional.
export type AdminUpdateVenueInput = Partial<AdminCreateVenueInput>;

// Specific input type for Shop Owner when updating their venue details.
// They should not be able to change owner_user_id or status directly.
// Google Place ID might also be restricted post-creation.
export type ShopOwnerUpdateVenueInput = Partial<Omit<AdminCreateVenueInput, 'owner_user_id' | 'status' | 'google_place_id'>>;

// Specific input type for Shop Owner when creating a new venue.
// owner_user_id and status will be set by the backend or have defaults.
export type ShopOwnerCreateVenueInput = Omit<AdminCreateVenueInput, 'owner_user_id' | 'status'>;


// Corresponds to `Venue` type in GraphQL schema
export interface Venue extends AdminCreateVenueInput {
  id: string;
  average_rating?: number | null;
  review_count?: number | null;
  reviews?: VenueReview[] | null; // Assuming it can be null if not fetched
  created_at: string; // ISO8601 String
  updated_at: string; // ISO8601 String
}

// For PetForm, if needed elsewhere (example from previous context)
export interface PetFormData {
  name: string;
  species: string;
  breed?: string | null;
  birthdate?: string | null; // YYYY-MM-DD
  avatar_url?: string | null;
  notes?: string | null;
}

export interface Pet extends PetFormData {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
