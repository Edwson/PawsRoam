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


interface Resolvers {
  Query: {
    [key: string]: (...args: any[]) => any;
  };
  Mutation?: {
    [key: string]: (...args: any[]) => any;
  };
}

export const resolvers: Resolvers = {
  Query: {
    _empty: () => "This is a placeholder query.",
    // Example: me: (parent, args, context) => { // Assuming context contains userId
    //   if (!context.userId) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    //   return usersDB.find(user => user.id === context.userId); // This would need to query DB users now
    // }
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
  },
};
