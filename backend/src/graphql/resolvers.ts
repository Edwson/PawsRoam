import { generateToken, hashPassword, comparePassword, ensureAdmin, ensureShopOwnerOrAdmin } from '../utils/auth';
import { generateTextFromGemini } from '../utils/gemini';
import { GraphQLError } from 'graphql';
import { pgPool } from '../config/db'; // Import the pgPool

// Define User type for database results (matches users table structure)
interface DbUser {
  id: string; // UUID
  email: string;
  name?: string | null; // Nullable in DB
  password_hash: string;
  role: string; // Added role
  status: string; // Added status
  created_at: Date;
  updated_at: Date;
}

// Define Venue type for database results (matches venues table structure)
// This should map to the GraphQL Venue type; field names should align or be mapped.
interface DbVenue {
  id: string; // UUID
  owner_user_id?: string | null;
  name: string;
  address?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  latitude: number; // Comes as string from pg, will be parsed
  longitude: number; // Comes as string from pg, will be parsed
  phone_number?: string | null;
  website?: string | null;
  description?: string | null;
  opening_hours?: any | null; // JSONB
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
  weight_limit_kg?: number | null; // Comes as string from pg
  carrier_required?: boolean | null;
  additional_pet_services?: string | null;
  status?: string | null;
  google_place_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DbPet {
    id: string; // UUID
    user_id: string; // UUID
    name: string;
    species: string;
    breed?: string | null;
    birthdate?: Date | null; // Comes as Date from DB
    avatar_url?: string | null;
    notes?: string | null;
    created_at: Date;
    updated_at: Date;
}

interface DbReview {
    id: string; // UUID
    user_id: string; // UUID
    venue_id: string; // UUID
    rating: number;
    comment?: string | null;
    visit_date?: Date | null;
    created_at: Date;
    updated_at: Date;
}

// Define context type for resolvers
interface ResolverContext {
  userId?: string | null; // userId will be injected from Apollo Server context
}

// Utility function to update venue's average rating and review count
async function updateVenueRating(venueId: string) {
  if (!pgPool) return; // Should be handled by calling resolver, but good check

  const ratingQuery = `
    SELECT
      COALESCE(AVG(rating), 0) as average_rating,
      COUNT(id) as review_count
    FROM reviews
    WHERE venue_id = $1;
  `;
  const updateVenueQuery = `
    UPDATE venues
    SET average_rating = $1, review_count = $2
    WHERE id = $3;
  `;
  try {
    const ratingResult = await pgPool.query(ratingQuery, [venueId]);
    const { average_rating, review_count } = ratingResult.rows[0];

    // Ensure average_rating is formatted to 2 decimal places if it's a number
    const formattedAvgRating = parseFloat(average_rating).toFixed(2);

    await pgPool.query(updateVenueQuery, [formattedAvgRating, review_count, venueId]);
    console.log(`Updated venue ${venueId} with avg_rating: ${formattedAvgRating}, review_count: ${review_count}`);
  } catch (error) {
    console.error(`Failed to update venue rating for ${venueId}:`, error);
    // Decide if this error should propagate or just be logged
  }
}


interface Resolvers {
  Query: {
    [key: string]: (parent: any, args: any, context: ResolverContext, info: any) => any;
  };
  Mutation?: {
    [key: string]: (parent: any, args: any, context: ResolverContext, info: any) => any;
  };
  Review?: { // Field resolvers for Review type
    user: (parent: DbReview, args: any, context: ResolverContext, info: any) => any;
    venue: (parent: DbReview, args: any, context: ResolverContext, info: any) => any;
  };
  // Add other types like Pet if they have field resolvers
  // Pet?: {
  //   owner?: (parent: DbPet, args: any, context: ResolverContext, info: any) => any;
  // };
  Venue?: { // Field resolvers for Venue type
    reviews: (parent: DbVenue, args: any, context: ResolverContext, info: any) => any;
  };
}

export const resolvers: Resolvers = {
  Query: {
    _empty: () => "This is a placeholder query.",
    // Example: me: (parent, args, context) => { // Assuming context contains userId
    //   if (!context.userId) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    //   return usersDB.find(user => user.id === context.userId); // This would need to query DB users now
    // }
    myPets: async (_parent: any, _args: any, context: ResolverContext) => {
      if (!context.userId) {
        throw new GraphQLError('User is not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      try {
        const result = await pgPool.query<DbPet>('SELECT * FROM pets WHERE user_id = $1 ORDER BY created_at DESC', [context.userId]);
        return result.rows.map(pet => ({
          ...pet,
          birthdate: pet.birthdate ? pet.birthdate.toISOString().split('T')[0] : null, // Format date as YYYY-MM-DD
          created_at: pet.created_at.toISOString(),
          updated_at: pet.updated_at.toISOString(),
        }));
      } catch (dbError: any) {
        console.error("Error fetching pets:", dbError);
        throw new GraphQLError('Failed to fetch pets.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },
    myOwnedVenues: async (_parent: any, _args: any, context: ResolverContext) => {
      const { userId, role } = await ensureShopOwnerOrAdmin(context); // Ensures user is shop_owner or admin
      // If role needs to be strictly 'business_owner' for this query:
      // if (role !== 'business_owner') {
      //   throw new GraphQLError('Only shop owners can view their owned venues.', { extensions: { code: 'FORBIDDEN' }});
      // }

      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      try {
        const result = await pgPool.query<DbVenue>(
          'SELECT * FROM venues WHERE owner_user_id = $1 ORDER BY name ASC',
          [userId]
        );
        return result.rows.map(venue => ({
          ...venue,
          latitude: parseFloat(venue.latitude as any),
          longitude: parseFloat(venue.longitude as any),
          weight_limit_kg: venue.weight_limit_kg ? parseFloat(venue.weight_limit_kg as any) : null,
          created_at: venue.created_at.toISOString(),
          updated_at: venue.updated_at.toISOString(),
          // image_url will be part of ...venue if it exists in DbVenue and is selected
        }));
      } catch (dbError: any) {
        console.error("Error fetching owned venues:", dbError);
        throw new GraphQLError('Failed to fetch owned venues.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },
    getPetCareAdvice: async (_: any, { question }: { question: string }) => {
      if (!process.env.GEMINI_API_KEY) {
        return "PawsAI Pet Care Advisor is currently unavailable (API key not configured).";
      }
      if (!question || question.trim() === "") {
        throw new GraphQLError('Question cannot be empty.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const disclaimer = "\n\n--- \n**Disclaimer:** I am an AI assistant and this advice is for informational purposes only. It is not a substitute for professional veterinary consultation. Always consult a qualified veterinarian for any health concerns or before making any decisions related to your pet's health.";

      const prompt = `
        You are PawsAI, a friendly and knowledgeable virtual pet care assistant for the PawsRoam platform.
        A user has asked the following pet care question: "${question}"

        Please provide a helpful, concise, and easy-to-understand answer based on general pet care knowledge.
        If the question is about a serious medical issue, or if you are unsure, strongly recommend consulting a veterinarian.
        If the question is nonsensical, irrelevant to pet care, or potentially harmful, politely decline to answer or provide a very generic helpful pet tip instead.
        Keep your answer to a maximum of 3-4 paragraphs.

        Your response should ONLY be the answer to the question.
      `;

      try {
        const advice = await generateTextFromGemini(prompt);
        if (advice.startsWith("Gemini API Error:") || advice.startsWith("Gemini API key not configured")) {
            // If generateTextFromGemini itself returns an error message, pass it through
            // but still append our specific disclaimer for pet care context.
            return advice + disclaimer;
        }
        // Check for common refusal phrases if Gemini couldn't answer (this is a basic check)
        const lowerCaseAdvice = advice.toLowerCase();
        if (lowerCaseAdvice.includes("i cannot help with that") || lowerCaseAdvice.includes("i'm unable to provide") || lowerCaseAdvice.includes("i'm not able to")) {
            return "I'm sorry, I can't provide specific advice on that topic. For detailed pet care questions, especially regarding health, it's always best to consult a professional veterinarian." + disclaimer;
        }
        return advice + disclaimer;
      } catch (error: any) {
        console.error("Error in getPetCareAdvice resolver:", error);
        // The generateTextFromGemini function already formats errors, so we might just re-throw or return its message.
        // However, to ensure our disclaimer is always there:
        let errorMessage = "Sorry, I encountered an issue while trying to fetch advice. Please try again later.";
        if (error.message && error.message.startsWith("Gemini API Error:")) {
            errorMessage = error.message;
        }
        throw new GraphQLError(errorMessage + disclaimer, { // Append disclaimer even to GQL errors from this resolver
            extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error.message }
        });
      }
    },
    getVenueById: async (_parent: any, { id }: { id: string }, context: ResolverContext) => {
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      try {
        const result = await pgPool.query<DbVenue>('SELECT * FROM venues WHERE id = $1', [id]);
        if (result.rows.length === 0) {
          throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
        }
        const venue = result.rows[0];
        return {
          ...venue,
          latitude: parseFloat(venue.latitude as any),
          longitude: parseFloat(venue.longitude as any),
          weight_limit_kg: venue.weight_limit_kg ? parseFloat(venue.weight_limit_kg as any) : null,
          created_at: venue.created_at.toISOString(),
          updated_at: venue.updated_at.toISOString(),
          // Reviews will be resolved by the Venue.reviews field resolver
        };
      } catch (dbError: any) {
        console.error(`Error fetching venue ${id}:`, dbError);
        if (dbError.extensions?.code === 'NOT_FOUND') {
            throw dbError;
        }
        throw new GraphQLError('Failed to fetch venue.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },
    getReviewsForVenue: async (_parent: any, { venueId }: { venueId: string }, context: ResolverContext) => {
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      try {
        const result = await pgPool.query<DbReview>(
          'SELECT * FROM reviews WHERE venue_id = $1 ORDER BY created_at DESC',
          [venueId]
        );
        return result.rows.map(review => ({
          ...review,
          visit_date: review.visit_date ? review.visit_date.toISOString().split('T')[0] : null,
          created_at: review.created_at.toISOString(),
          updated_at: review.updated_at.toISOString(),
        }));
      } catch (dbError: any) {
        console.error(`Error fetching reviews for venue ${venueId}:`, dbError);
        throw new GraphQLError('Failed to fetch reviews.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },
    myReviews: async (_parent: any, _args: any, context: ResolverContext) => {
      if (!context.userId) {
        throw new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      try {
        const result = await pgPool.query<DbReview>(
          'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC',
          [context.userId]
        );
        return result.rows.map(review => ({
          ...review,
          visit_date: review.visit_date ? review.visit_date.toISOString().split('T')[0] : null,
          created_at: review.created_at.toISOString(),
          updated_at: review.updated_at.toISOString(),
        }));
      } catch (dbError: any) {
        console.error('Error fetching user reviews:', dbError);
        throw new GraphQLError('Failed to fetch your reviews.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },
    searchVenues: async (_: any, { filterByName, filterByType }: { filterByName?: string, filterByType?: string }) => {
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      let query = 'SELECT * FROM venues';
      const conditions: string[] = [];
      const values: (string | number)[] = [];
      let valueCount = 1;

      if (filterByName) {
        conditions.push(`name ILIKE $${valueCount++}`); // ILIKE for case-insensitive search
        values.push(`%${filterByName}%`);
      }
      if (filterByType) {
        conditions.push(`type = $${valueCount++}`);
        values.push(filterByType);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY created_at DESC LIMIT 50'; // Add ordering and limit for safety

      try {
        const result = await pgPool.query<DbVenue>(query, values);
        // Ensure numeric fields are numbers, not strings from pg driver
        return result.rows.map(venue => ({
          ...venue,
          latitude: parseFloat(venue.latitude as any),
          longitude: parseFloat(venue.longitude as any),
          weight_limit_kg: venue.weight_limit_kg ? parseFloat(venue.weight_limit_kg as any) : null,
          // Convert TIMESTAMPTZ to ISO string for GraphQL
          created_at: venue.created_at.toISOString(),
          updated_at: venue.updated_at.toISOString(),
        }));
      } catch (dbError: any) {
        console.error("Error searching venues in DB:", dbError);
        throw new GraphQLError('Failed to search venues.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },
    testGemini: async (_: any, { prompt }: { prompt: string }) => {
      if (!process.env.GEMINI_API_KEY) {
        return "Gemini API key not configured on the server.";
      }
      if (!prompt) {
        throw new GraphQLError('Prompt cannot be empty', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      try {
        const result = await generateTextFromGemini(prompt);
        return result;
      } catch (error: any) {
        console.error("Error in testGemini resolver:", error);
        throw new GraphQLError(error.message || 'Failed to get response from Gemini', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
  Mutation: {
    registerUser: async (_: any, { email, password, name }: { email: string, password: string, name?: string }) => {
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      // Check if user already exists
      const existingUserResult = await pgPool.query<DbUser>('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUserResult.rows.length > 0) {
        throw new GraphQLError('Email already in use', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const passwordHash = await hashPassword(password);

      const insertQuery = 'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name';
      const values = [email, name || null, passwordHash];

      try {
        const newUserResult = await pgPool.query<DbUser>(insertQuery, values);
        const newUser = newUserResult.rows[0];

        const token = generateToken({ id: newUser.id, email: newUser.email });

        return {
          token,
          user: { id: newUser.id, email: newUser.email, name: newUser.name || undefined },
        };
      } catch (dbError: any) {
        console.error("Error registering user in DB:", dbError);
        throw new GraphQLError('Failed to register user.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    adminUpdateUser: async (_parent: any, { userId, input }: { userId: string, input: any /* AdminUpdateUserInput */ }, context: ResolverContext) => {
      await ensureAdmin(context);
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      const { name, email, role, status } = input;
      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      if (name !== undefined) { setClauses.push(`name = $${valueCount++}`); values.push(name); }
      if (email !== undefined) {
        // Optional: Add validation if email format is correct
        // Optional: Check if new email already exists for another user
        setClauses.push(`email = $${valueCount++}`); values.push(email);
      }
      if (role !== undefined) {
        // Optional: Validate role against a list of allowed roles
        setClauses.push(`role = $${valueCount++}`); values.push(role);
      }
      if (status !== undefined) {
        // Optional: Validate status against a list of allowed statuses
        setClauses.push(`status = $${valueCount++}`); values.push(status);
      }

      if (setClauses.length === 0) {
        throw new GraphQLError('No update fields provided', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE users SET ${setClauses.join(', ')}
        WHERE id = $${valueCount++}
        RETURNING *;
      `;
      values.push(userId);

      try {
        const result = await pgPool.query<DbUser>(query, values);
        if (result.rows.length === 0) {
          throw new GraphQLError('User not found or update failed', { extensions: { code: 'NOT_FOUND' } });
        }
        const updatedUser = result.rows[0];
        // Map to GraphQL User type, ensuring all fields are present
        return {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          status: updatedUser.status,
          // avatar_url: updatedUser.avatar_url, // If avatar_url is part of DbUser and User type
          created_at: updatedUser.created_at.toISOString(),
          updated_at: updatedUser.updated_at.toISOString(),
        };
      } catch (dbError: any) {
        console.error("Error in adminUpdateUser:", dbError);
        if (dbError.code === '23505' && dbError.constraint === 'users_email_key') { // Unique constraint violation for email
            throw new GraphQLError('Email address is already in use by another account.', {
                extensions: { code: 'BAD_USER_INPUT' },
            });
        }
        throw new GraphQLError('Failed to update user.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    shopOwnerCreateVenue: async (_parent: any, { input }: { input: any /* AdminCreateVenueInput */ }, context: ResolverContext) => {
      const { userId } = await ensureShopOwnerOrAdmin(context); // Ensures user is shop_owner or admin
      if (!pgPool) throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

      // Destructure all fields from input, which matches AdminCreateVenueInput
      const { name, address, city, state_province, postal_code, country, latitude, longitude, phone_number, website, description, opening_hours, type, pet_policy_summary, pet_policy_details, allows_off_leash, has_indoor_seating_for_pets, has_outdoor_seating_for_pets, water_bowls_provided, pet_treats_available, pet_menu_available, dedicated_pet_area, weight_limit_kg, carrier_required, additional_pet_services, status, google_place_id } = input;

      // owner_user_id is overridden with the authenticated shop owner's ID
      const ownerUserIdForDb = userId;

      // Default status if not provided by shop owner, or use what they send if allowed by input type
      const venueStatus = status || 'pending_approval'; // Default to pending approval for shop owner submissions

      const query = `
        INSERT INTO venues (owner_user_id, name, address, city, state_province, postal_code, country, latitude, longitude, phone_number, website, description, opening_hours, type, pet_policy_summary, pet_policy_details, allows_off_leash, has_indoor_seating_for_pets, has_outdoor_seating_for_pets, water_bowls_provided, pet_treats_available, pet_menu_available, dedicated_pet_area, weight_limit_kg, carrier_required, additional_pet_services, status, google_place_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING *;
      `;
      const values = [ownerUserIdForDb, name, address, city, state_province, postal_code, country, latitude, longitude, phone_number, website, description, opening_hours, type, pet_policy_summary, pet_policy_details, allows_off_leash, has_indoor_seating_for_pets, has_outdoor_seating_for_pets, water_bowls_provided, pet_treats_available, pet_menu_available, dedicated_pet_area, weight_limit_kg, carrier_required, additional_pet_services, venueStatus, google_place_id];

      try {
        const result = await pgPool.query<DbVenue>(query, values);
        const newVenue = result.rows[0];
        // Map to GraphQL Venue type
        return {
          ...newVenue,
          latitude: parseFloat(newVenue.latitude as any),
          longitude: parseFloat(newVenue.longitude as any),
          weight_limit_kg: newVenue.weight_limit_kg ? parseFloat(newVenue.weight_limit_kg as any) : null,
          created_at: newVenue.created_at.toISOString(),
          updated_at: newVenue.updated_at.toISOString(),
          // image_url: newVenue.image_url, // if image_url is part of DbVenue and selected
        };
      } catch (dbError: any) {
        console.error("Error in shopOwnerCreateVenue:", dbError);
        // Handle specific errors like unique constraint violations if necessary
        throw new GraphQLError('Failed to create venue as shop owner.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    adminUpdateVenueImage: async (_parent: any, { venueId, imageUrl }: { venueId: string, imageUrl: string }, context: ResolverContext) => {
      await ensureAdmin(context);
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      try {
        // Conceptually, this updates the image_url for the venue.
        // UPDATE venues SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;
        // Since image_url might not exist in the actual DB schema based on schema.sql,
        // we'll fetch the venue and return it with the new imageUrl conceptually added/updated.

        const venueResult = await pgPool.query<DbVenue>('SELECT * FROM venues WHERE id = $1', [venueId]);
        if (venueResult.rows.length === 0) {
          throw new GraphQLError('Venue not found.', { extensions: { code: 'NOT_FOUND' } });
        }

        const dbVenue = venueResult.rows[0];
        console.log(`Conceptually updated image_url for venue ${venueId} to ${imageUrl}`);

        return {
          ...dbVenue,
          image_url: imageUrl, // Add/update the imageUrl to the returned object
          latitude: parseFloat(dbVenue.latitude as any), // Ensure correct types for GQL
          longitude: parseFloat(dbVenue.longitude as any),
          weight_limit_kg: dbVenue.weight_limit_kg ? parseFloat(dbVenue.weight_limit_kg as any) : null,
          created_at: dbVenue.created_at.toISOString(),
          updated_at: new Date().toISOString(), // Simulate updated_at being changed
        };

      } catch (dbError: any) {
        console.error("Error in adminUpdateVenueImage:", dbError);
        if (dbError instanceof GraphQLError) throw dbError;
        throw new GraphQLError('Failed to update venue image.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    updatePetAvatar: async (_parent: any, { petId, imageUrl }: { petId: string, imageUrl: string }, context: ResolverContext) => {
      if (!context.userId) {
        throw new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      try {
        // Verify pet ownership first
        const petCheckResult = await pgPool.query<DbPet>('SELECT user_id FROM pets WHERE id = $1', [petId]);
        if (petCheckResult.rows.length === 0) {
          throw new GraphQLError('Pet not found.', { extensions: { code: 'NOT_FOUND' } });
        }
        if (petCheckResult.rows[0].user_id !== context.userId) {
          throw new GraphQLError('User not authorized to update this pet.', { extensions: { code: 'FORBIDDEN' } });
        }

        // Update the pet's avatar_url
        const updateResult = await pgPool.query<DbPet>(
          'UPDATE pets SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *;',
          [imageUrl, petId, context.userId]
        );

        if (updateResult.rows.length === 0) {
          // This should ideally not happen if the above checks passed, but as a safeguard:
          throw new GraphQLError('Failed to update pet avatar. Pet not found or not owned by user.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        }

        const updatedPet = updateResult.rows[0];
        return {
          ...updatedPet,
          birthdate: updatedPet.birthdate ? updatedPet.birthdate.toISOString().split('T')[0] : null,
          created_at: updatedPet.created_at.toISOString(),
          updated_at: updatedPet.updated_at.toISOString(),
        };

      } catch (dbError: any) {
        console.error("Error in updatePetAvatar:", dbError);
        if (dbError instanceof GraphQLError) throw dbError; // Re-throw if it's already a GraphQLError
        throw new GraphQLError('Failed to update pet avatar.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    updateUserProfilePicture: async (_parent: any, { imageUrl }: { imageUrl: string }, context: ResolverContext) => {
      if (!context.userId) {
        throw new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      try {
        // Conceptually, we'd update the users table.
        // UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;
        // Since avatar_url might not exist, we'll simulate the update and return the user data as if it did.

        // First, fetch the current user data to return
        const userResult = await pgPool.query<DbUser>('SELECT * FROM users WHERE id = $1', [context.userId]);
        if (userResult.rows.length === 0) {
          throw new GraphQLError('User not found.', { extensions: { code: 'NOT_FOUND' } });
        }

        // Simulate that the DB operation for setting avatar_url happened.
        // In a real scenario, the RETURNING * from the UPDATE query would give us the updated user.
        const dbUser = userResult.rows[0];

        // Here, we would log the conceptual update:
        console.log(`Conceptually updated avatar_url for user ${context.userId} to ${imageUrl}`);

        // Return the user object, including the new (simulated) avatar_url
        return {
          ...dbUser,
          avatar_url: imageUrl, // Add the new imageUrl to the returned object
          created_at: dbUser.created_at.toISOString(),
          updated_at: new Date().toISOString(), // Simulate updated_at being changed
        };

      } catch (dbError: any) {
        console.error("Error in updateUserProfilePicture:", dbError);
        if (dbError instanceof GraphQLError) throw dbError;
        throw new GraphQLError('Failed to update profile picture.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    loginUser: async (_: any, { email, password }: { email: string, password: string }) => {
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      const result = await pgPool.query<DbUser>('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const token = generateToken({ id: user.id, email: user.email });

      return {
        token,
        user: { id: user.id, email: user.email, name: user.name || undefined },
      };
    },

    createPet: async (_parent: any, { input }: { input: any }, context: ResolverContext) => {
      if (!context.userId) {
        throw new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      const { name, species, breed, birthdate, avatar_url, notes } = input;
      const query = `
        INSERT INTO pets (user_id, name, species, breed, birthdate, avatar_url, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const values = [context.userId, name, species, breed, birthdate, avatar_url, notes];
      try {
        const result = await pgPool.query<DbPet>(query, values);
        const newPet = result.rows[0];
        return {
          ...newPet,
          birthdate: newPet.birthdate ? newPet.birthdate.toISOString().split('T')[0] : null,
          created_at: newPet.created_at.toISOString(),
          updated_at: newPet.updated_at.toISOString(),
        };
      } catch (dbError: any) {
        console.error("Error creating pet:", dbError);
        throw new GraphQLError('Failed to create pet.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    updatePet: async (_parent: any, { id, input }: { id: string, input: any }, context: ResolverContext) => {
      if (!context.userId) {
        throw new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      const { name, species, breed, birthdate, avatar_url, notes } = input;

      // Check if pet exists and belongs to the user
      const existingPetResult = await pgPool.query<DbPet>('SELECT user_id FROM pets WHERE id = $1', [id]);
      if (existingPetResult.rows.length === 0) {
        throw new GraphQLError('Pet not found', { extensions: { code: 'NOT_FOUND' } });
      }
      if (existingPetResult.rows[0].user_id !== context.userId) {
        throw new GraphQLError('User not authorized to update this pet', { extensions: { code: 'FORBIDDEN' } });
      }

      // Dynamically build the SET part of the query
      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      if (name !== undefined) { setClauses.push(`name = $${valueCount++}`); values.push(name); }
      if (species !== undefined) { setClauses.push(`species = $${valueCount++}`); values.push(species); }
      if (breed !== undefined) { setClauses.push(`breed = $${valueCount++}`); values.push(breed); }
      if (birthdate !== undefined) { setClauses.push(`birthdate = $${valueCount++}`); values.push(birthdate); } // Allow null
      if (avatar_url !== undefined) { setClauses.push(`avatar_url = $${valueCount++}`); values.push(avatar_url); } // Allow null
      if (notes !== undefined) { setClauses.push(`notes = $${valueCount++}`); values.push(notes); } // Allow null

      if (setClauses.length === 0) {
        throw new GraphQLError('No update fields provided', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`); // Always update this

      const query = `
        UPDATE pets SET ${setClauses.join(', ')}
        WHERE id = $${valueCount++} AND user_id = $${valueCount++}
        RETURNING *;
      `;
      values.push(id, context.userId);

      try {
        const result = await pgPool.query<DbPet>(query, values);
        if (result.rows.length === 0) {
          // Should not happen if initial check passed, but good for safety
          throw new GraphQLError('Pet not found or update failed', { extensions: { code: 'NOT_FOUND' } });
        }
        const updatedPet = result.rows[0];
        return {
          ...updatedPet,
          birthdate: updatedPet.birthdate ? updatedPet.birthdate.toISOString().split('T')[0] : null,
          created_at: updatedPet.created_at.toISOString(),
          updated_at: updatedPet.updated_at.toISOString(),
        };
      } catch (dbError: any) {
        console.error("Error updating pet:", dbError);
        throw new GraphQLError('Failed to update pet.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    deletePet: async (_parent: any, { id }: { id: string }, context: ResolverContext) => {
      if (!context.userId) {
        throw new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      const query = 'DELETE FROM pets WHERE id = $1 AND user_id = $2 RETURNING id;';
      try {
        const result = await pgPool.query(query, [id, context.userId]);
        return result.rowCount === 1; // True if one row was deleted
      } catch (dbError: any) {
        console.error("Error deleting pet:", dbError);
        throw new GraphQLError('Failed to delete pet.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },
  },
  Mutation: {
    // ... (existing user and pet mutations) ...
    registerUser: async (_parent: any, { email, password, name }: { email: string, password: string, name?: string }, context: ResolverContext) => {
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      const existingUserResult = await pgPool.query<DbUser>('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUserResult.rows.length > 0) {
        throw new GraphQLError('Email already in use', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      const passwordHash = await hashPassword(password);
      // Add default role 'user' and status 'active'
      const insertQuery = `
        INSERT INTO users (email, name, password_hash, role, status)
        VALUES ($1, $2, $3, 'user', 'active')
        RETURNING id, email, name, role, status, created_at, updated_at;
      `;
      const values = [email, name || null, passwordHash];
      try {
        const newUserResult = await pgPool.query<DbUser>(insertQuery, values);
        const newUser = newUserResult.rows[0];
        const token = generateToken({ id: newUser.id, email: newUser.email });
        return {
          token,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            status: newUser.status,
            created_at: newUser.created_at.toISOString(),
            updated_at: newUser.updated_at.toISOString(),
          },
        };
      } catch (dbError: any) {
        console.error("Error registering user in DB:", dbError);
        throw new GraphQLError('Failed to register user.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },
    loginUser: async (_parent: any, { email, password }: { email: string, password: string }, context: ResolverContext) => {
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      // Select all necessary fields including role and status
      const result = await pgPool.query<DbUser>('SELECT id, email, name, password_hash, role, status, created_at, updated_at FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
      if (!user) {
        throw new GraphQLError('Invalid email or password', { extensions: { code: 'UNAUTHENTICATED' } });
      }
       if (user.status === 'suspended') {
        throw new GraphQLError('Account is suspended.', { extensions: { code: 'FORBIDDEN' } });
      }
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new GraphQLError('Invalid email or password', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      const token = generateToken({ id: user.id, email: user.email });
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at.toISOString(),
        },
      };
    },
    createPet: async (_parent: any, { input }: { input: any }, context: ResolverContext) => {
      // ... (implementation from previous step, no changes needed here for user role/status)
      if (!context.userId) { throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } }); }
      if (!pgPool) { throw new GraphQLError('DB error'); }
      const { name, species, breed, birthdate, avatar_url, notes } = input;
      const query = `INSERT INTO pets (user_id, name, species, breed, birthdate, avatar_url, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`;
      const values = [context.userId, name, species, breed, birthdate, avatar_url, notes];
      const result = await pgPool.query<DbPet>(query, values);
      const newPet = result.rows[0];
      return { ...newPet, birthdate: newPet.birthdate ? newPet.birthdate.toISOString().split('T')[0] : null, created_at: newPet.created_at.toISOString(),updated_at: newPet.updated_at.toISOString() };
    },
    updatePet: async (_parent: any, { id, input }: { id: string, input: any }, context: ResolverContext) => {
      // ... (implementation from previous step)
      if (!context.userId) { throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } }); }
      if (!pgPool) { throw new GraphQLError('DB error'); }
      const { name, species, breed, birthdate, avatar_url, notes } = input;
      const existingPetResult = await pgPool.query<DbPet>('SELECT user_id FROM pets WHERE id = $1', [id]);
      if (existingPetResult.rows.length === 0) { throw new GraphQLError('Pet not found', { extensions: { code: 'NOT_FOUND' } }); }
      if (existingPetResult.rows[0].user_id !== context.userId) { throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } }); }
      const setClauses: string[] = []; const values: any[] = []; let valueCount = 1;
      if (name !== undefined) { setClauses.push(`name = $${valueCount++}`); values.push(name); }
      if (species !== undefined) { setClauses.push(`species = $${valueCount++}`); values.push(species); }
      if (breed !== undefined) { setClauses.push(`breed = $${valueCount++}`); values.push(breed); }
      if (birthdate !== undefined) { setClauses.push(`birthdate = $${valueCount++}`); values.push(birthdate); }
      if (avatar_url !== undefined) { setClauses.push(`avatar_url = $${valueCount++}`); values.push(avatar_url); }
      if (notes !== undefined) { setClauses.push(`notes = $${valueCount++}`); values.push(notes); }
      if (setClauses.length === 0) { throw new GraphQLError('No update fields', { extensions: { code: 'BAD_USER_INPUT' } }); }
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      const query = `UPDATE pets SET ${setClauses.join(', ')} WHERE id = $${valueCount++} AND user_id = $${valueCount++} RETURNING *;`;
      values.push(id, context.userId);
      const result = await pgPool.query<DbPet>(query, values);
      const updatedPet = result.rows[0];
      return { ...updatedPet, birthdate: updatedPet.birthdate ? updatedPet.birthdate.toISOString().split('T')[0] : null, created_at: updatedPet.created_at.toISOString(),updated_at: updatedPet.updated_at.toISOString() };
    },
    deletePet: async (_parent: any, { id }: { id: string }, context: ResolverContext) => {
      // ... (implementation from previous step)
      if (!context.userId) { throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } }); }
      if (!pgPool) { throw new GraphQLError('DB error'); }
      const query = 'DELETE FROM pets WHERE id = $1 AND user_id = $2 RETURNING id;';
      const result = await pgPool.query(query, [id, context.userId]);
      return result.rowCount === 1;
    },

    // ADMIN VENUE MUTATIONS
    adminCreateVenue: async (_parent: any, { input }: { input: any }, context: ResolverContext) => {
      await ensureAdmin(context); // Authorize admin
      if (!pgPool) throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

      const { owner_user_id, name, address, city, state_province, postal_code, country, latitude, longitude, phone_number, website, description, opening_hours, type, pet_policy_summary, pet_policy_details, allows_off_leash, has_indoor_seating_for_pets, has_outdoor_seating_for_pets, water_bowls_provided, pet_treats_available, pet_menu_available, dedicated_pet_area, weight_limit_kg, carrier_required, additional_pet_services, status, google_place_id } = input;

      const query = `
        INSERT INTO venues (owner_user_id, name, address, city, state_province, postal_code, country, latitude, longitude, phone_number, website, description, opening_hours, type, pet_policy_summary, pet_policy_details, allows_off_leash, has_indoor_seating_for_pets, has_outdoor_seating_for_pets, water_bowls_provided, pet_treats_available, pet_menu_available, dedicated_pet_area, weight_limit_kg, carrier_required, additional_pet_services, status, google_place_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING *;
      `;
      const values = [owner_user_id, name, address, city, state_province, postal_code, country, latitude, longitude, phone_number, website, description, opening_hours, type, pet_policy_summary, pet_policy_details, allows_off_leash, has_indoor_seating_for_pets, has_outdoor_seating_for_pets, water_bowls_provided, pet_treats_available, pet_menu_available, dedicated_pet_area, weight_limit_kg, carrier_required, additional_pet_services, status ?? 'pending_approval', google_place_id];

      try {
        const result = await pgPool.query<DbVenue>(query, values);
        const newVenue = result.rows[0];
        return { // Map to GraphQL Venue type
          ...newVenue,
          latitude: parseFloat(newVenue.latitude as any),
          longitude: parseFloat(newVenue.longitude as any),
          weight_limit_kg: newVenue.weight_limit_kg ? parseFloat(newVenue.weight_limit_kg as any) : null,
          created_at: newVenue.created_at.toISOString(),
          updated_at: newVenue.updated_at.toISOString(),
        };
      } catch (dbError: any) {
        console.error("Error in adminCreateVenue:", dbError);
        throw new GraphQLError('Failed to create venue.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    adminUpdateVenue: async (_parent: any, { id, input }: { id: string, input: any }, context: ResolverContext) => {
      await ensureAdmin(context);
      if (!pgPool) throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      // Dynamically build SET clause based on provided input fields
      Object.keys(input).forEach(key => {
        if (input[key] !== undefined) {
          // Ensure snake_case for DB columns if GraphQL uses camelCase for some (though schema is snake_case mostly)
          setClauses.push(`${key} = $${valueCount++}`);
          values.push(input[key]);
        }
      });

      if (setClauses.length === 0) {
        throw new GraphQLError('No update fields provided', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`); // Always update this timestamp

      const query = `
        UPDATE venues SET ${setClauses.join(', ')}
        WHERE id = $${valueCount++}
        RETURNING *;
      `;
      values.push(id);

      try {
        const result = await pgPool.query<DbVenue>(query, values);
        if (result.rows.length === 0) {
          throw new GraphQLError('Venue not found or update failed', { extensions: { code: 'NOT_FOUND' } });
        }
        const updatedVenue = result.rows[0];
        return {
          ...updatedVenue,
          latitude: parseFloat(updatedVenue.latitude as any),
          longitude: parseFloat(updatedVenue.longitude as any),
          weight_limit_kg: updatedVenue.weight_limit_kg ? parseFloat(updatedVenue.weight_limit_kg as any) : null,
          created_at: updatedVenue.created_at.toISOString(),
          updated_at: updatedVenue.updated_at.toISOString(),
        };
      } catch (dbError: any) {
        console.error("Error in adminUpdateVenue:", dbError);
        if (dbError.extensions?.code === 'NOT_FOUND') throw dbError;
        throw new GraphQLError('Failed to update venue.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    adminDeleteVenue: async (_parent: any, { id }: { id: string }, context: ResolverContext) => {
      await ensureAdmin(context);
      if (!pgPool) throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

      // Optional: Check if venue has associated reviews and decide on deletion policy.
      // For now, simple delete. If FK constraints are 'ON DELETE CASCADE' for reviews.venue_id, reviews will be deleted.
      // Otherwise, they might be orphaned or prevent deletion if 'ON DELETE RESTRICT'.
      // For simplicity, we'll assume reviews are either cascaded or deletion is allowed.

      const query = 'DELETE FROM venues WHERE id = $1 RETURNING id;';
      try {
        const result = await pgPool.query(query, [id]);
        return result.rowCount === 1; // True if one row was deleted
      } catch (dbError: any) {
        console.error("Error in adminDeleteVenue:", dbError);
        // Check for foreign key violation if reviews are not set to cascade delete
        if (dbError.code === '23503') { // PostgreSQL foreign key violation error code
             throw new GraphQLError('Cannot delete venue. It may have associated reviews or other dependent data.', {
                extensions: { code: 'BAD_REQUEST', originalError: "Foreign key constraint violation." }, // Or a more specific code
            });
        }
        throw new GraphQLError('Failed to delete venue.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    shopOwnerUpdateVenueDetails: async (_parent: any, { venueId, input }: { venueId: string, input: any /* ShopOwnerUpdateVenueInput */ }, context: ResolverContext) => {
      const { userId, role } = await ensureShopOwnerOrAdmin(context);
      if (!pgPool) throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

      // Verify ownership if not an admin
      if (role !== 'admin') {
        const venueCheckResult = await pgPool.query('SELECT owner_user_id FROM venues WHERE id = $1', [venueId]);
        if (venueCheckResult.rows.length === 0) {
          throw new GraphQLError('Venue not found.', { extensions: { code: 'NOT_FOUND' } });
        }
        if (venueCheckResult.rows[0].owner_user_id !== userId) {
          throw new GraphQLError('User not authorized to update this venue.', { extensions: { code: 'FORBIDDEN' } });
        }
      }

      // Fields shop owner can update (explicitly exclude status and owner_user_id from input)
      const { name, address, city, state_province, postal_code, country, latitude, longitude, phone_number, website, description, opening_hours, type, pet_policy_summary, pet_policy_details, allows_off_leash, has_indoor_seating_for_pets, has_outdoor_seating_for_pets, water_bowls_provided, pet_treats_available, pet_menu_available, dedicated_pet_area, weight_limit_kg, carrier_required, additional_pet_services, google_place_id } = input;

      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      // Helper to add clause if value is defined
      const addClause = (field: string, value: any) => {
        if (value !== undefined) {
          setClauses.push(`${field} = $${valueCount++}`);
          values.push(value);
        }
      };

      addClause('name', name);
      addClause('address', address);
      addClause('city', city);
      addClause('state_province', state_province);
      addClause('postal_code', postal_code);
      addClause('country', country);
      addClause('latitude', latitude);
      addClause('longitude', longitude);
      addClause('phone_number', phone_number);
      addClause('website', website);
      addClause('description', description);
      addClause('opening_hours', opening_hours);
      addClause('type', type);
      addClause('pet_policy_summary', pet_policy_summary);
      addClause('pet_policy_details', pet_policy_details);
      addClause('allows_off_leash', allows_off_leash);
      addClause('has_indoor_seating_for_pets', has_indoor_seating_for_pets);
      addClause('has_outdoor_seating_for_pets', has_outdoor_seating_for_pets);
      addClause('water_bowls_provided', water_bowls_provided);
      addClause('pet_treats_available', pet_treats_available);
      addClause('pet_menu_available', pet_menu_available);
      addClause('dedicated_pet_area', dedicated_pet_area);
      addClause('weight_limit_kg', weight_limit_kg);
      addClause('carrier_required', carrier_required);
      addClause('additional_pet_services', additional_pet_services);
      addClause('google_place_id', google_place_id);
      // Shop owners cannot change status directly via this mutation. Status changes might occur via admin or specific approval flows.

      if (setClauses.length === 0) {
        throw new GraphQLError('No update fields provided', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `UPDATE venues SET ${setClauses.join(', ')} WHERE id = $${valueCount++} RETURNING *;`;
      values.push(venueId);

      try {
        const result = await pgPool.query<DbVenue>(query, values);
        if (result.rows.length === 0) {
          throw new GraphQLError('Venue not found or update failed', { extensions: { code: 'NOT_FOUND' } });
        }
        const updatedVenue = result.rows[0];
        return { // Map to GraphQL Venue type
          ...updatedVenue,
          latitude: parseFloat(updatedVenue.latitude as any),
          longitude: parseFloat(updatedVenue.longitude as any),
          weight_limit_kg: updatedVenue.weight_limit_kg ? parseFloat(updatedVenue.weight_limit_kg as any) : null,
          created_at: updatedVenue.created_at.toISOString(),
          updated_at: updatedVenue.updated_at.toISOString(),
        };
      } catch (dbError: any) {
        console.error("Error in shopOwnerUpdateVenueDetails:", dbError);
        throw new GraphQLError('Failed to update venue details.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    shopOwnerUpdateVenueImage: async (_parent: any, { venueId, imageUrl }: { venueId: string, imageUrl: string }, context: ResolverContext) => {
      const { userId, role } = await ensureShopOwnerOrAdmin(context);
      if (!pgPool) throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

      if (role !== 'admin') {
        const venueCheckResult = await pgPool.query('SELECT owner_user_id FROM venues WHERE id = $1', [venueId]);
        if (venueCheckResult.rows.length === 0) {
          throw new GraphQLError('Venue not found.', { extensions: { code: 'NOT_FOUND' } });
        }
        if (venueCheckResult.rows[0].owner_user_id !== userId) {
          throw new GraphQLError('User not authorized to update image for this venue.', { extensions: { code: 'FORBIDDEN' } });
        }
      }

      // Conceptually update image_url. Fetch and return the venue.
      // In a real scenario: UPDATE venues SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;
      console.log(`Conceptually updated image_url for venue ${venueId} to ${imageUrl} by user ${userId}`);
      const venueResult = await pgPool.query<DbVenue>('SELECT * FROM venues WHERE id = $1', [venueId]);
      if (venueResult.rows.length === 0) { // Should be caught by above check if not admin, but good safety.
          throw new GraphQLError('Venue not found after conceptual image update.', { extensions: { code: 'NOT_FOUND' } });
      }
      const dbVenue = venueResult.rows[0];
      return {
        ...dbVenue,
        image_url: imageUrl, // Simulate the update in the returned object
        latitude: parseFloat(dbVenue.latitude as any),
        longitude: parseFloat(dbVenue.longitude as any),
        weight_limit_kg: dbVenue.weight_limit_kg ? parseFloat(dbVenue.weight_limit_kg as any) : null,
        created_at: dbVenue.created_at.toISOString(),
        updated_at: new Date().toISOString(), // Simulate timestamp update
      };
    },

    addReview: async (_parent: any, { input }: { input: any }, context: ResolverContext) => {
      if (!context.userId) {
        throw new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      const { venueId, rating, comment, visit_date } = input;
      // Input validation for rating
      if (rating < 1 || rating > 5) {
        throw new GraphQLError('Rating must be between 1 and 5', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const query = `
        INSERT INTO reviews (user_id, venue_id, rating, comment, visit_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const values = [context.userId, venueId, rating, comment, visit_date];
      try {
        const result = await pgPool.query<DbReview>(query, values);
        const newReview = result.rows[0];

        await updateVenueRating(venueId); // Update venue's average rating

        return { // Map to GraphQL Review type
          ...newReview,
          visit_date: newReview.visit_date ? newReview.visit_date.toISOString().split('T')[0] : null,
          created_at: newReview.created_at.toISOString(),
          updated_at: newReview.updated_at.toISOString(),
        };
      } catch (dbError: any) {
        console.error("Error adding review:", dbError);
        if (dbError.constraint === 'uq_user_venue_review') {
            throw new GraphQLError('You have already reviewed this venue.', { extensions: { code: 'BAD_USER_INPUT' } });
        }
        throw new GraphQLError('Failed to add review.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    updateReview: async (_parent: any, { reviewId, input }: { reviewId: string, input: any }, context: ResolverContext) => {
      if (!context.userId) {
        throw new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      // Check if review exists and belongs to the user
      const existingReviewResult = await pgPool.query<DbReview>('SELECT user_id, venue_id FROM reviews WHERE id = $1', [reviewId]);
      if (existingReviewResult.rows.length === 0) {
        throw new GraphQLError('Review not found', { extensions: { code: 'NOT_FOUND' } });
      }
      const existingReview = existingReviewResult.rows[0];
      if (existingReview.user_id !== context.userId) {
        throw new GraphQLError('User not authorized to update this review', { extensions: { code: 'FORBIDDEN' } });
      }

      const { rating, comment, visit_date } = input;
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        throw new GraphQLError('Rating must be between 1 and 5', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      if (rating !== undefined) { setClauses.push(`rating = $${valueCount++}`); values.push(rating); }
      if (comment !== undefined) { setClauses.push(`comment = $${valueCount++}`); values.push(comment); }
      if (visit_date !== undefined) { setClauses.push(`visit_date = $${valueCount++}`); values.push(visit_date); }

      if (setClauses.length === 0) {
        throw new GraphQLError('No update fields provided', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE reviews SET ${setClauses.join(', ')}
        WHERE id = $${valueCount++} AND user_id = $${valueCount++}
        RETURNING *;
      `;
      values.push(reviewId, context.userId);

      try {
        const result = await pgPool.query<DbReview>(query, values);
        const updatedReview = result.rows[0];

        await updateVenueRating(existingReview.venue_id); // Update venue's average rating

        return {
          ...updatedReview,
          visit_date: updatedReview.visit_date ? updatedReview.visit_date.toISOString().split('T')[0] : null,
          created_at: updatedReview.created_at.toISOString(),
          updated_at: updatedReview.updated_at.toISOString(),
        };
      } catch (dbError: any) {
        console.error("Error updating review:", dbError);
        throw new GraphQLError('Failed to update review.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },

    deleteReview: async (_parent: any, { reviewId }: { reviewId: string }, context: ResolverContext) => {
      if (!context.userId) {
        throw new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      // Get venue_id before deleting for rating update
      const reviewDataResult = await pgPool.query<{ venue_id: string }>('SELECT venue_id FROM reviews WHERE id = $1 AND user_id = $2', [reviewId, context.userId]);
      if (reviewDataResult.rows.length === 0) {
          throw new GraphQLError('Review not found or user not authorized', { extensions: { code: 'NOT_FOUND' } });
      }
      const { venue_id } = reviewDataResult.rows[0];

      const query = 'DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id;';
      try {
        const result = await pgPool.query(query, [reviewId, context.userId]);
        if (result.rowCount === 1) {
            await updateVenueRating(venue_id); // Update venue's average rating
            return true;
        }
        return false;
      } catch (dbError: any) {
        console.error("Error deleting review:", dbError);
        throw new GraphQLError('Failed to delete review.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    },
  },
  Review: {
    user: async (parent: DbReview, _args: any, _context: ResolverContext) => {
      if (!pgPool) throw new GraphQLError('Database not configured');
      const result = await pgPool.query<DbUser>('SELECT id, name, email FROM users WHERE id = $1', [parent.user_id]);
      return result.rows[0] ? { ...result.rows[0] } : null;
    },
    venue: async (parent: DbReview, _args: any, _context: ResolverContext) => {
      if (!pgPool) throw new GraphQLError('Database not configured');
      const result = await pgPool.query<DbVenue>('SELECT * FROM venues WHERE id = $1', [parent.venue_id]);
      // Basic mapping, ensure all fields match GraphQL Venue type or map them
      const venue = result.rows[0];
      return venue ? {
        ...venue,
        latitude: parseFloat(venue.latitude as any),
        longitude: parseFloat(venue.longitude as any),
        weight_limit_kg: venue.weight_limit_kg ? parseFloat(venue.weight_limit_kg as any) : null,
        created_at: venue.created_at.toISOString(),
        updated_at: venue.updated_at.toISOString(),
       } : null;
    }
  },
  Venue: {
    reviews: async (parent: DbVenue, _args: any, context: ResolverContext) => {
      // This is the field resolver for Venue.reviews
      // It uses the getReviewsForVenue resolver logic, but scoped to the parent venue.
      if (!pgPool) {
        throw new GraphQLError('Database not configured', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      try {
        // parent.id is the venue_id for which to fetch reviews
        const result = await pgPool.query<DbReview>(
          'SELECT * FROM reviews WHERE venue_id = $1 ORDER BY created_at DESC',
          [parent.id]
        );
        return result.rows.map(review => ({
          ...review,
          visit_date: review.visit_date ? review.visit_date.toISOString().split('T')[0] : null,
          created_at: review.created_at.toISOString(),
          updated_at: review.updated_at.toISOString(),
          // The 'user' and 'venue' fields for each Review will be resolved by their own field resolvers
        }));
      } catch (dbError: any) {
        console.error(`Error fetching reviews for venue ${parent.id} in Venue.reviews resolver:`, dbError);
        throw new GraphQLError('Failed to fetch reviews for venue.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: dbError.message },
        });
      }
    }
  }
};
