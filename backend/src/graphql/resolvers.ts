import { generateToken, hashPassword, comparePassword } from '../utils/auth';
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
  }
};
