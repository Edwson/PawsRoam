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

// --- Mock Venue Database ---
interface Venue {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string; // e.g., "cafe", "park", "store"
  description: string;
}

const venuesDB: Venue[] = [
  { id: 'v1', name: 'The Barking Lot Cafe', address: '123 Doggo Street, Pawsburg', latitude: 35.6800, longitude: 139.7000, type: 'cafe', description: 'A cozy cafe for you and your furry friend. Offers puppuccinos!' },
  { id: 'v2', name: 'Pawsitive Park', address: '456 Fetch Avenue, Pawsburg', latitude: 35.6850, longitude: 139.7050, type: 'park', description: 'Large off-leash area with agility equipment.' },
  { id: 'v3', name: 'The Groom Room', address: '789 Tailwag Trail, Pawsburg', latitude: 35.6900, longitude: 139.7100, type: 'store', description: 'Pet supplies and professional grooming services.' },
  { id: 'v4', name: 'Catnip Corner', address: '101 Meow Lane, Pawsburg', latitude: 35.6750, longitude: 139.6950, type: 'cafe', description: 'A quiet cafe that welcomes well-behaved cats on leashes.' },
  { id: 'v5', name: 'Riverside Dog Run', address: '222 Water Woof Way, Pawsburg', latitude: 35.6950, longitude: 139.7150, type: 'park', description: 'Scenic park with a dedicated dog run along the river.' },
];
// --- End Mock Venue Database ---


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
    //   return usersDB.find(user => user.id === context.userId);
    // }
    searchVenues: (_: any, { filterByName, filterByType }: { filterByName?: string, filterByType?: string }) => {
      let results = venuesDB;
      if (filterByName) {
        results = results.filter(venue => venue.name.toLowerCase().includes(filterByName.toLowerCase()));
      }
      if (filterByType) {
        results = results.filter(venue => venue.type.toLowerCase() === filterByType.toLowerCase());
      }
      return results;
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
