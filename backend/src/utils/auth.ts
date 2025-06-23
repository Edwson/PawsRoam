import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key'; // IMPORTANT: Use a strong secret from env variables in production
const SALT_ROUNDS = 10;

interface UserPayload {
  userId: string;
  email: string;
}

export const generateToken = (user: { id: string; email: string }): string => {
  const payload: UserPayload = {
    userId: user.id,
    email: user.email,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }); // Token expires in 1 day
};

export const verifyToken = (token: string): UserPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Utility to get user ID from Authorization header (Bearer token)
// This would typically be used in context creation for Apollo Server
export const getUserIdFromAuthHeader = (authHeader?: string): string | null => {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token) {
      const decoded = verifyToken(token);
      return decoded ? decoded.userId : null;
    }
  }
  return null;
};

import { GraphQLError } from 'graphql';
import { pgPool } from '../config/db'; // For fetching user role
import { ResolverContext } from '../graphql/resolvers'; // Assuming ResolverContext is exported or defined accessibly

// Helper function to ensure the user is an admin
export const ensureAdmin = async (context: ResolverContext): Promise<void> => {
  if (!context.userId) {
    throw new GraphQLError('User is not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  if (!pgPool) {
    throw new GraphQLError('Database not configured', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  try {
    const userRoleResult = await pgPool.query('SELECT role FROM users WHERE id = $1', [context.userId]);
    if (userRoleResult.rows.length === 0) {
      throw new GraphQLError('User not found', { // Should not happen if JWT is valid and user exists
        extensions: { code: 'INTERNAL_SERVER_ERROR' }, // Or NOT_FOUND
      });
    }
    const userRole = userRoleResult.rows[0].role;
    if (userRole !== 'admin') {
      throw new GraphQLError('User is not authorized to perform this action', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    // If user is admin, function completes without throwing
  } catch (error: any) {
    if (error instanceof GraphQLError) throw error; // Re-throw GQL errors
    console.error("Error checking admin status:", error);
    throw new GraphQLError('Error verifying user authorization', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
};
